import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/renderer/src/App";
import { highlightSearchMatches, nextScrollTopForRow, rowTopWithinScrollPane, scrollPaneToTop } from "../src/renderer/src/features/popup/ClipboardPopup";
import { exposedApiKeys } from "../src/preload/api";
import { defaultCopClipSettings, type CopClipSettings, type CopClipSettingsPatch } from "../src/shared/app-settings";
import { clipboardItemSearchText, type ClipboardItem } from "../src/shared/clipboard-history";

const pngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

afterEach(() => {
  cleanup();
  delete window.copclip;
  window.history.pushState({}, "", "/");
});

function createClips(): ClipboardItem[] {
  const capturedAt = new Date(Date.UTC(2026, 4, 1, 12)).toISOString();

  return [
    {
      id: "clip-1",
      type: "text",
      text: "Release checklist",
      preview: "Release checklist",
      capturedAt,
      pinned: false
    },
    {
      id: "clip-2",
      type: "text",
      text: "GitHub issue link",
      preview: "GitHub issue link",
      capturedAt,
      pinned: false
    }
  ];
}

function createManyClips(): ClipboardItem[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `clip-${index + 1}`,
    type: "text" as const,
    text: `Recent clip ${index + 1}`,
    preview: `Recent clip ${index + 1}`,
    capturedAt: new Date(Date.UTC(2026, 4, 1, 12, index)).toISOString(),
    pinned: false
  }));
}

function createMixedClips(): ClipboardItem[] {
  const capturedAt = new Date(Date.UTC(2026, 4, 1, 12)).toISOString();

  return [
    {
      id: "clip-link",
      type: "link",
      text: "https://example.com/docs",
      url: "https://example.com/docs",
      preview: "https://example.com/docs",
      capturedAt,
      pinned: false
    },
    {
      id: "clip-html",
      type: "html",
      text: "Formatted release note",
      html: "<p><strong>Formatted</strong> release note</p>",
      preview: "Formatted release note",
      capturedAt,
      pinned: false
    },
    {
      id: "clip-image",
      type: "image",
      imageDataUrl: pngDataUrl,
      width: 1,
      height: 1,
      preview: "Image 1x1",
      capturedAt,
      pinned: false
    }
  ];
}

function sortClips(items: ClipboardItem[]): ClipboardItem[] {
  return [...items].sort((first, second) => {
    if (first.pinned !== second.pinned) {
      return first.pinned ? -1 : 1;
    }

    return second.capturedAt.localeCompare(first.capturedAt);
  });
}

function installClipboardApi(clips = createClips(), settings: CopClipSettings = defaultCopClipSettings) {
  let popupOpenedCallback: ((items: ClipboardItem[]) => void) | undefined;
  let historyChangedCallback: ((items: ClipboardItem[]) => void) | undefined;
  let settingsChangedCallback: ((settings: CopClipSettings) => void) | undefined;
  let currentClips = clips;
  let currentSettings = settings;
  const api = {
    clearClipboardHistory: vi.fn(async () => {
      currentClips = [];
      historyChangedCallback?.(currentClips);
      return currentClips;
    }),
    deleteClipboardItem: vi.fn(async (id: string) => {
      currentClips = currentClips.filter((item) => item.id !== id);
      historyChangedCallback?.(currentClips);
      return currentClips;
    }),
    getAppInfo: () => ({ name: "CopClip", version: "0.1.0", platform: "darwin" as const }),
    dismissClipboardPopup: vi.fn(async () => undefined),
    getSettings: vi.fn(async () => currentSettings),
    listClipboardHistory: vi.fn(async (query = "") => {
      const normalizedQuery = query.toLocaleLowerCase();
      return normalizedQuery
        ? currentClips.filter((item) => clipboardItemSearchText(item).toLocaleLowerCase().includes(normalizedQuery))
        : currentClips;
    }),
    onClipboardHistoryChanged: vi.fn((callback: (items: ClipboardItem[]) => void) => {
      historyChangedCallback = callback;
      return () => undefined;
    }),
    onClipboardPopupOpened: vi.fn((callback: (items: ClipboardItem[]) => void) => {
      popupOpenedCallback = callback;
      return () => undefined;
    }),
    onSettingsChanged: vi.fn((callback: (settings: CopClipSettings) => void) => {
      settingsChangedCallback = callback;
      return () => undefined;
    }),
    openSettings: vi.fn(async () => undefined),
    openPopup: () => {
      popupOpenedCallback?.(currentClips);
    },
    pinClipboardItem: vi.fn(async (id: string) => {
      currentClips = sortClips(currentClips.map((item) => item.id === id ? { ...item, pinned: true } : item));
      historyChangedCallback?.(currentClips);
      return currentClips;
    }),
    emitHistoryChanged: () => {
      historyChangedCallback?.(currentClips);
    },
    replaceClips: (nextClips: ClipboardItem[]) => {
      currentClips = nextClips;
    },
    restoreClipboardItem: vi.fn(async () => true),
    unpinClipboardItem: vi.fn(async (id: string) => {
      currentClips = sortClips(currentClips.map((item) => item.id === id ? { ...item, pinned: false } : item));
      historyChangedCallback?.(currentClips);
      return currentClips;
    }),
    updateSettings: vi.fn(async (patch: CopClipSettingsPatch) => {
      if (patch.historyLimit === 0 || patch.historyLimit === "0") {
        return {
          ok: false,
          settings: currentSettings,
          errors: {
            historyLimit: "Use a number from 1 to 5000."
          }
        };
      }

      currentSettings = {
        ...currentSettings,
        activePinboardId:
          typeof patch.activePinboardId === "string" ? patch.activePinboardId : currentSettings.activePinboardId,
        capturePaused:
          typeof patch.capturePaused === "boolean" ? patch.capturePaused : currentSettings.capturePaused,
        checkForUpdatesAutomatically:
          typeof patch.checkForUpdatesAutomatically === "boolean"
            ? patch.checkForUpdatesAutomatically
            : currentSettings.checkForUpdatesAutomatically,
        historyLimit:
          typeof patch.historyLimit === "number"
            ? patch.historyLimit
            : typeof patch.historyLimit === "string"
              ? Number(patch.historyLimit)
              : currentSettings.historyLimit,
        ignoredAppBundleIds:
          Array.isArray(patch.ignoredAppBundleIds)
            ? patch.ignoredAppBundleIds.filter((item): item is string => typeof item === "string")
            : currentSettings.ignoredAppBundleIds,
        ignoredWindowsAppIdentifiers:
          Array.isArray(patch.ignoredWindowsAppIdentifiers)
            ? patch.ignoredWindowsAppIdentifiers.filter((item): item is string => typeof item === "string")
            : currentSettings.ignoredWindowsAppIdentifiers,
        popupSize: {
          width:
            typeof patch.popupSize?.width === "number"
              ? patch.popupSize.width
              : typeof patch.popupSize?.width === "string"
                ? Number(patch.popupSize.width)
                : currentSettings.popupSize.width,
          height:
            typeof patch.popupSize?.height === "number"
              ? patch.popupSize.height
              : typeof patch.popupSize?.height === "string"
                ? Number(patch.popupSize.height)
                : currentSettings.popupSize.height
        },
        openClipboardHistoryShortcut:
          typeof patch.openClipboardHistoryShortcut === "string"
            ? patch.openClipboardHistoryShortcut
            : currentSettings.openClipboardHistoryShortcut,
        launchAtLogin:
          typeof patch.launchAtLogin === "boolean" ? patch.launchAtLogin : currentSettings.launchAtLogin,
        pasteAutomatically:
          typeof patch.pasteAutomatically === "boolean" ? patch.pasteAutomatically : currentSettings.pasteAutomatically,
        pasteWithFormattingShortcut:
          typeof patch.pasteWithFormattingShortcut === "string"
            ? patch.pasteWithFormattingShortcut
            : currentSettings.pasteWithFormattingShortcut,
        pinboards:
          Array.isArray(patch.pinboards)
            ? patch.pinboards.filter((item): item is { id: string; name: string } =>
                Boolean(item) &&
                typeof item === "object" &&
                "id" in item &&
                "name" in item &&
                typeof item.id === "string" &&
                typeof item.name === "string"
              )
            : currentSettings.pinboards,
        popupPosition:
          patch.popupPosition === "cursor" ||
          patch.popupPosition === "bottom" ||
          patch.popupPosition === "top" ||
          patch.popupPosition === "center" ||
          patch.popupPosition === "last-position"
            ? patch.popupPosition
            : currentSettings.popupPosition,
        theme:
          patch.theme === "system" || patch.theme === "light" || patch.theme === "dark"
            ? patch.theme
            : currentSettings.theme,
        showNextPinboardShortcut:
          typeof patch.showNextPinboardShortcut === "string"
            ? patch.showNextPinboardShortcut
            : currentSettings.showNextPinboardShortcut,
        showPreviousPinboardShortcut:
          typeof patch.showPreviousPinboardShortcut === "string"
            ? patch.showPreviousPinboardShortcut
            : currentSettings.showPreviousPinboardShortcut
      };
      settingsChangedCallback?.(currentSettings);
      return {
        ok: true,
        settings: currentSettings,
        errors: {}
      };
    })
  };

  window.copclip = api;
  return api;
}

describe("popup row scroll math", () => {
  it("does not scroll when the selected row is fully visible", () => {
    expect(nextScrollTopForRow({
      padding: 8,
      rowHeight: 95,
      rowTop: 100,
      scrollHeight: 500,
      viewportHeight: 140,
      visibleTop: 80
    })).toBe(80);
  });

  it("scrolls down enough to show the full selected row", () => {
    expect(nextScrollTopForRow({
      padding: 8,
      rowHeight: 95,
      rowTop: 190,
      scrollHeight: 500,
      viewportHeight: 120,
      visibleTop: 78
    })).toBe(173);
  });

  it("scrolls up enough to show the full selected row", () => {
    expect(nextScrollTopForRow({
      direction: "nearest",
      padding: 8,
      rowHeight: 95,
      rowTop: 285,
      scrollHeight: 500,
      viewportHeight: 120,
      visibleTop: 355
    })).toBe(277);
  });

  it("aligns the row toward the top when keyboard navigation moves upward", () => {
    expect(nextScrollTopForRow({
      direction: "up",
      padding: 8,
      rowHeight: 95,
      rowTop: 285,
      scrollHeight: 500,
      viewportHeight: 120,
      visibleTop: 270
    })).toBe(277);
  });

  it("clamps scrolling at the list edges", () => {
    expect(nextScrollTopForRow({
      padding: 8,
      rowHeight: 95,
      rowTop: 0,
      scrollHeight: 475,
      viewportHeight: 120,
      visibleTop: 50
    })).toBe(0);
    expect(nextScrollTopForRow({
      padding: 8,
      rowHeight: 95,
      rowTop: 380,
      scrollHeight: 475,
      viewportHeight: 120,
      visibleTop: 268
    })).toBe(355);
  });

  it("measures row position relative to the scroll pane instead of the page", () => {
    expect(rowTopWithinScrollPane({
      rowViewportTop: 412,
      scrollPaneViewportTop: 127,
      visibleTop: 80
    })).toBe(365);
  });

  it("uses smooth scroll when moving the results pane programmatically", () => {
    const pane = {
      scrollTop: 0,
      scrollTo: vi.fn(({ top }: ScrollToOptions) => {
        pane.scrollTop = Number(top);
      })
    };

    scrollPaneToTop(pane, 78, "smooth");

    expect(pane.scrollTo).toHaveBeenCalledWith({ top: 78, behavior: "smooth" });
    expect(pane.scrollTop).toBe(78);
  });
});

describe("popup search highlighting", () => {
  it("wraps matching search text without changing surrounding text", () => {
    const { container } = render(<>{highlightSearchMatches("GitHub issue link", "git")}</>);

    expect(container).toHaveTextContent("GitHub issue link");
    expect(container.querySelector("mark")).toHaveTextContent("Git");
  });
});

describe("CopClip app shell", () => {
  it("shows the desktop shell for normal app usage", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    const { container } = render(<App />);

    expect(screen.getByLabelText("CopClip desktop shell")).toBeInTheDocument();
    expect(container.querySelector("[data-window-drag-region='desktop']")).toHaveClass("[app-region:drag]");
    expect(screen.getByLabelText("CopClip navigation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /General/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shortcuts/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subscription/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help Center" })).toHaveAttribute("href", "https://copclip-website.vercel.app/");
    expect(screen.queryByLabelText("Clipboard popup")).not.toBeInTheDocument();
    expect(screen.queryByText("Recent Clips")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(api.listClipboardHistory).toHaveBeenCalledWith("");
      expect(screen.getAllByText("Release checklist").length).toBeGreaterThan(0);
    });
  });

  it("navigates between separate desktop settings pages", async () => {
    installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Privacy/ }));
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByText("Ignore macOS Applications")).toBeInTheDocument();
    expect(screen.getByText("Ignore Windows Applications")).toBeInTheDocument();
    expect(screen.getByLabelText("Pause clipboard capture")).toBeInTheDocument();
    expect(screen.queryByLabelText("Show during screen sharing")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Generate link previews")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ignore confidential content")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Ignore transient content")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Shortcuts/ }));
    expect(screen.getByRole("heading", { name: "Shortcuts" })).toBeInTheDocument();
    expect(screen.getByLabelText("Activate Paste")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Subscription/ }));
    expect(screen.getByRole("heading", { name: "Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Local build")).toBeInTheDocument();
  });

  it("opens a requested desktop settings page from the hash", () => {
    installClipboardApi(createManyClips());
    window.history.pushState({}, "", "/?surface=desktop#privacy");

    render(<App />);

    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy/ })).toHaveAttribute("aria-current", "page");
  });

  it("keeps the desktop settings shell visible when persisted settings are missing newer fields", async () => {
    const api = installClipboardApi();
    api.getSettings.mockResolvedValueOnce({
      capturePaused: false,
      historyLimit: 100,
      ignoredAppBundleIds: [],
      ignoredWindowsAppIdentifiers: [],
      launchAtLogin: false,
      openClipboardHistoryShortcut: "CommandOrControl+Shift+V",
      pasteAutomatically: true,
      pasteWithFormattingShortcut: "CommandOrControl+Shift+Return",
      popupPosition: "top",
      popupSize: {
        width: 650,
        height: 600
      },
      theme: "dark"
    } as unknown as CopClipSettings);
    window.history.pushState({}, "", "/?surface=desktop#shortcuts");

    render(<App />);

    expect(screen.getByLabelText("CopClip desktop shell")).toBeInTheDocument();
    expect(await screen.findByLabelText("Show next Pinboard")).toHaveValue("⌘→");
    expect(screen.getByRole("button", { name: "Activate pinboard Default" })).toBeInTheDocument();
  });

  it("shows desktop history controls for local clipboard management", async () => {
    const api = installClipboardApi(createManyClips());
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    expect((await screen.findAllByText("Recent clip 1")).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Pin clipboard item: Recent clip 1/ }));
    await waitFor(() => {
      expect(api.pinClipboardItem).toHaveBeenCalledWith("clip-1");
      expect(screen.getByText("Pinned")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete clipboard item: Recent clip 1/ }));
    await waitFor(() => {
      expect(api.deleteClipboardItem).toHaveBeenCalledWith("clip-1");
      expect(screen.queryByText("Recent clip 1")).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear history" }));
    await waitFor(() => {
      expect(api.clearClipboardHistory).toHaveBeenCalledOnce();
      expect(screen.getByText("No clipboard history yet")).toBeInTheDocument();
    });
  });

  it("shows the compact clipboard popup without the full window shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByLabelText("Clipboard popup")).toBeInTheDocument();
    expect(screen.getByLabelText("Search clipboard history")).toBeEnabled();
    expect(screen.queryByLabelText("Close clipboard popup")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("CopClip navigation")).not.toBeInTheDocument();
  });

  it("labels URL clips and shows image thumbnails in the popup", async () => {
    installClipboardApi(createMixedClips());

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: https:\/\/example.com\/docs/
      })).toBeInTheDocument();
      expect(screen.getByText("Link")).toBeInTheDocument();
      expect(screen.getByText("HTML")).toBeInTheDocument();
      expect(screen.getByText("Image")).toBeInTheDocument();
      expect(screen.getAllByText("Formatted release note").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Image 1x1").length).toBeGreaterThan(0);
    });
    expect(document.querySelector(".clip-image-preview img")).toHaveAttribute("src", pngDataUrl);
  });

  it("uses theme-aware popup and shortcut text colors in light theme", async () => {
    installClipboardApi(createClips(), {
      ...defaultCopClipSettings,
      theme: "light"
    });

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(screen.getByLabelText("CopClip clipboard popup")).toHaveClass("text-[var(--popup-fg)]");
    expect(screen.getByLabelText("Clipboard popup")).toHaveClass("[background:var(--popup-bg)]");
    expect(screen.getByRole("heading", { name: "History" })).toHaveClass("text-[var(--popup-fg)]");
    expect(screen.getByLabelText("Search clipboard history")).toHaveClass("text-[var(--popup-fg)]");
    expect(screen.getByRole("button", { name: "Clear history" })).toHaveClass("text-[var(--popup-fg)]");
    expect(screen.getAllByText("Release checklist").some((element) => element.classList.contains("text-[var(--popup-fg)]"))).toBe(true);

    cleanup();
    installClipboardApi(createClips(), {
      ...defaultCopClipSettings,
      theme: "light"
    });
    window.history.pushState({}, "", "/?surface=desktop#shortcuts");
    render(<App />);

    expect(await screen.findByText("Activate Paste Stack")).toHaveClass("text-[var(--settings-fg)]");
  });

  it("documents the intentionally exposed preload API surface", () => {
    expect(exposedApiKeys).toEqual([
      "clearClipboardHistory",
      "deleteClipboardItem",
      "getAppInfo",
      "dismissClipboardPopup",
      "getSettings",
      "listClipboardHistory",
      "onClipboardHistoryChanged",
      "onClipboardPopupOpened",
      "onSettingsChanged",
      "openSettings",
      "pinClipboardItem",
      "restoreClipboardItem",
      "unpinClipboardItem",
      "updateSettings"
    ]);
  });

  it("allows editing persisted desktop settings", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Shortcuts/ }));
    const hotkeyInput = await screen.findByLabelText("Activate Paste");
    fireEvent.focus(hotkeyInput);
    expect(hotkeyInput).toHaveValue("Press shortcut...");
    fireEvent.keyDown(hotkeyInput, { altKey: true, ctrlKey: true, key: "v" });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        openClipboardHistoryShortcut: "CommandOrControl+Alt+V"
      });
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("disables desktop shortcuts when the clear button is pressed", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop#shortcuts");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Disable Activate Paste shortcut" }));
    fireEvent.click(screen.getByRole("button", { name: "Disable Activate Paste Stack shortcut" }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({ openClipboardHistoryShortcut: "" });
      expect(api.updateSettings).toHaveBeenCalledWith({ pasteWithFormattingShortcut: "" });
      expect(screen.getAllByDisplayValue("Disabled")).toHaveLength(2);
    });
  });

  it("resets desktop shortcuts to defaults", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop#shortcuts");

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Disable Activate Paste shortcut" }));
    fireEvent.click(screen.getByRole("button", { name: "Disable Activate Paste Stack shortcut" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset shortcuts to default..." }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        openClipboardHistoryShortcut: defaultCopClipSettings.openClipboardHistoryShortcut,
        pasteWithFormattingShortcut: defaultCopClipSettings.pasteWithFormattingShortcut,
        showNextPinboardShortcut: defaultCopClipSettings.showNextPinboardShortcut,
        showPreviousPinboardShortcut: defaultCopClipSettings.showPreviousPinboardShortcut
      });
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("edits pinboard shortcuts and manages pinboards", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop#shortcuts");

    render(<App />);

    const nextPinboardInput = await screen.findByLabelText("Show next Pinboard");
    fireEvent.focus(nextPinboardInput);
    fireEvent.keyDown(nextPinboardInput, { key: "ArrowRight", metaKey: true, shiftKey: true });

    fireEvent.change(screen.getByLabelText("Pinboard name"), {
      target: { value: "Work" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add pinboard" }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        showNextPinboardShortcut: "CommandOrControl+Shift+Right"
      });
      expect(screen.getByRole("button", { name: "Activate pinboard Work" })).toBeInTheDocument();
    });

    const addCall = api.updateSettings.mock.calls.find(([patch]) => Array.isArray(patch.pinboards) && patch.pinboards.length === 2);
    expect(addCall?.[0]).toEqual({
      activePinboardId: expect.stringMatching(/^work-/),
      pinboards: [
        { id: "default", name: "Default" },
        { id: expect.stringMatching(/^work-/), name: "Work" }
      ]
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove pinboard Work" }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        activePinboardId: "default",
        pinboards: [{ id: "default", name: "Default" }]
      });
    });
  });

  it("updates Maccy-style behavior settings", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /General/ }));
    expect(screen.queryByLabelText("iCloud sync")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText("Open at login"));
    fireEvent.click(screen.getByLabelText("To clipboard"));
    fireEvent.change(screen.getByLabelText("Popup location"), {
      target: { value: "bottom" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Shortcuts/ }));
    fireEvent.keyDown(screen.getByLabelText("Activate Paste Stack"), {
      key: "Enter",
      metaKey: true,
      shiftKey: true
    });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({ launchAtLogin: true });
      expect(api.updateSettings).toHaveBeenCalledWith({ pasteAutomatically: false });
      expect(api.updateSettings).toHaveBeenCalledWith({ popupPosition: "bottom" });
      expect(api.updateSettings).toHaveBeenCalledWith({
        pasteWithFormattingShortcut: "CommandOrControl+Shift+Return"
      });
    });
  });

  it("updates privacy capture controls and ignored applications", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop#privacy");

    render(<App />);

    fireEvent.click(screen.getByLabelText("Pause clipboard capture"));
    fireEvent.change(screen.getByLabelText("Ignored app bundle ID"), {
      target: { value: "com.example.PasswordManager" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add ignored app" }));
    fireEvent.change(screen.getByLabelText("Ignored Windows app executable"), {
      target: { value: "PasswordManager.exe" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Add ignored Windows app" }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({ capturePaused: true });
      expect(api.updateSettings).toHaveBeenCalledWith({ ignoredAppBundleIds: ["com.example.PasswordManager"] });
      expect(api.updateSettings).toHaveBeenCalledWith({ ignoredWindowsAppIdentifiers: ["PasswordManager.exe"] });
      expect(screen.getByText("com.example.PasswordManager")).toBeInTheDocument();
      expect(screen.getByText("PasswordManager.exe")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove ignored app com.example.PasswordManager" }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({ ignoredAppBundleIds: [] });
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove ignored Windows app PasswordManager.exe" }));

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({ ignoredWindowsAppIdentifiers: [] });
    });
  });

  it("shows validation feedback for invalid desktop settings", async () => {
    installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /General/ }));
    const historyLimitInput = await screen.findByDisplayValue("100");
    fireEvent.change(historyLimitInput, {
      target: {
        value: "0"
      }
    });
    fireEvent.blur(historyLimitInput);

    await waitFor(() => {
      expect(screen.getAllByText("Check values").length).toBeGreaterThan(0);
      expect(screen.getByText("Use a number from 1 to 5000.")).toBeInTheDocument();
    });
  });

  it("allows clearing numeric settings fields while editing", async () => {
    installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /General/ }));
    const historyLimitInput = await screen.findByDisplayValue("100");
    fireEvent.change(historyLimitInput, {
      target: {
        value: ""
      }
    });

    expect(historyLimitInput).toHaveValue(null);
  });

  it("filters visible text clipboard history as the user types", async () => {
    installClipboardApi();

    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("Release checklist").length).toBeGreaterThan(0);
      expect(screen.getAllByText("GitHub issue link").length).toBeGreaterThan(0);
    });

    fireEvent.change(screen.getByLabelText("Search clipboard history"), {
      target: { value: "git" }
    });

    await waitFor(() => {
      expect(window.copclip?.listClipboardHistory).toHaveBeenLastCalledWith("git");
      expect(screen.queryAllByText("Release checklist")).toHaveLength(0);
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: GitHub issue link/
      })).toHaveAttribute("aria-selected", "true");
      expect(container.querySelector("mark")).toHaveTextContent("Git");
    });
  });

  it("restores a clicked visible text clipboard item", async () => {
    const api = installClipboardApi();

    render(<App />);

    const releaseItem = await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });

    fireEvent.click(releaseItem);

    await waitFor(() => {
      expect(api.restoreClipboardItem).toHaveBeenCalledWith("clip-1");
    });
  });

  it("pins and unpins popup history items without restoring them", async () => {
    const api = installClipboardApi();

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Pin clipboard item: Release checklist/ }));

    await waitFor(() => {
      expect(api.pinClipboardItem).toHaveBeenCalledWith("clip-1");
      expect(screen.getByText("Pinned")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Unpin clipboard item: Release checklist/ }));

    await waitFor(() => {
      expect(api.unpinClipboardItem).toHaveBeenCalledWith("clip-1");
      expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
    });
    expect(api.restoreClipboardItem).not.toHaveBeenCalled();
  });

  it("deletes and clears popup history items", async () => {
    const api = installClipboardApi();

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: /Delete clipboard item: Release checklist/ }));

    await waitFor(() => {
      expect(api.deleteClipboardItem).toHaveBeenCalledWith("clip-1");
      expect(screen.queryAllByText("Release checklist")).toHaveLength(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Clear history" }));

    await waitFor(() => {
      expect(api.clearClipboardHistory).toHaveBeenCalledOnce();
      expect(screen.getByText("Copy text, links, or images to start history")).toBeInTheDocument();
    });
    expect(api.restoreClipboardItem).not.toHaveBeenCalled();
  });

  it("clamps popup selection after deleting the selected item", async () => {
    const api = installClipboardApi();

    render(<App />);

    const githubItem = await screen.findByRole("button", {
      name: /Restore clipboard item 2: GitHub issue link/
    });
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.keyDown(window, { key: "ArrowDown" });
    await waitFor(() => {
      expect(githubItem).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.click(screen.getByRole("button", { name: /Delete clipboard item: GitHub issue link/ }));

    await waitFor(() => {
      expect(api.deleteClipboardItem).toHaveBeenCalledWith("clip-2");
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: Release checklist/
      })).toHaveAttribute("aria-selected", "true");
    });
  });

  it("moves selection with arrows and restores the selected item with Enter", async () => {
    const api = installClipboardApi();

    render(<App />);

    const githubItem = await screen.findByRole("button", {
      name: /Restore clipboard item 2: GitHub issue link/
    });
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.keyDown(window, { key: "ArrowDown" });
    await waitFor(() => {
      expect(githubItem).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => {
      expect(api.restoreClipboardItem).toHaveBeenCalledWith("clip-2");
    });
  });

  it("scrolls the selected popup item into view when keyboard selection moves", async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    installClipboardApi(createManyClips());

    try {
      render(<App />);

      await screen.findByRole("button", {
        name: /Restore clipboard item 1: Recent clip 1/
      });
      await act(async () => {
        await Promise.resolve();
      });
      scrollIntoView.mockClear();

      const resultsPane = screen.getByLabelText("Clipboard history results");
      const clipButtons = [1, 2, 3, 4, 5].map((index) => screen.getByRole("button", {
        name: new RegExp(`Restore clipboard item ${index}: Recent clip ${index}`)
      }));
      let scrollTop = 0;

      Object.defineProperty(resultsPane, "clientHeight", { configurable: true, value: 120 });
      Object.defineProperty(resultsPane, "scrollHeight", { configurable: true, value: 475 });
      Object.defineProperty(resultsPane, "scrollTop", {
        configurable: true,
        get: () => scrollTop,
        set: (value) => {
          scrollTop = value;
        }
      });
      resultsPane.scrollTo = vi.fn((optionsOrX?: ScrollToOptions | number) => {
        scrollTop = typeof optionsOrX === "number" ? optionsOrX : Number(optionsOrX?.top);
      }) as HTMLDivElement["scrollTo"];
      resultsPane.getBoundingClientRect = vi.fn(() => ({
        bottom: 220,
        height: 120,
        left: 0,
        right: 360,
        top: 100,
        width: 360,
        x: 0,
        y: 100,
        toJSON: () => ({})
      }));
      clipButtons.forEach((button, index) => {
        const row = button.parentElement!;

        Object.defineProperty(row, "offsetHeight", { configurable: true, value: 95 });
        row.getBoundingClientRect = vi.fn(() => ({
          bottom: 100 + (index * 95) + 95 - scrollTop,
          height: 95,
          left: 0,
          right: 360,
          top: 100 + (index * 95) - scrollTop,
          width: 360,
          x: 0,
          y: 100 + (index * 95) - scrollTop,
          toJSON: () => ({})
        }));
      });

      fireEvent.keyDown(window, { key: "ArrowDown" });

      await waitFor(() => {
        expect(clipButtons[1]).toHaveAttribute("aria-selected", "true");
        expect(scrollTop).toBe(78);
        expect(resultsPane.scrollTo).toHaveBeenLastCalledWith({ top: 78, behavior: "smooth" });
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: "ArrowDown" });
      fireEvent.keyDown(window, { key: "ArrowDown" });
      fireEvent.keyDown(window, { key: "ArrowDown" });

      await waitFor(() => {
        expect(clipButtons[4]).toHaveAttribute("aria-selected", "true");
        expect(scrollTop).toBe(355);
        expect(resultsPane.scrollTo).toHaveBeenLastCalledWith({ top: 355, behavior: "smooth" });
        expect(scrollIntoView).not.toHaveBeenCalled();
      });

      fireEvent.keyDown(window, { key: "ArrowUp" });

      await waitFor(() => {
        expect(clipButtons[3]).toHaveAttribute("aria-selected", "true");
        expect(scrollTop).toBe(277);
        expect(resultsPane.scrollTo).toHaveBeenLastCalledWith({ top: 277, behavior: "smooth" });
        expect(scrollIntoView).not.toHaveBeenCalled();
      });
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("does not scroll the popup results when pointer movement changes selection", async () => {
    installClipboardApi(createManyClips());

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Recent clip 1/
    });
    await act(async () => {
      await Promise.resolve();
    });

    const resultsPane = screen.getByLabelText("Clipboard history results");
    const thirdItem = screen.getByRole("button", {
      name: /Restore clipboard item 3: Recent clip 3/
    });
    let scrollTop = 0;

    Object.defineProperty(resultsPane, "clientHeight", { configurable: true, value: 120 });
    Object.defineProperty(resultsPane, "scrollHeight", { configurable: true, value: 475 });
    Object.defineProperty(resultsPane, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      }
    });
    Object.defineProperty(thirdItem.parentElement, "offsetHeight", { configurable: true, value: 95 });
    Object.defineProperty(thirdItem.parentElement, "offsetTop", { configurable: true, value: 190 });

    fireEvent.pointerMove(thirdItem.parentElement!, { clientX: 24, clientY: 180 });

    await waitFor(() => {
      expect(thirdItem).toHaveAttribute("aria-selected", "true");
      expect(scrollTop).toBe(0);
    });
  });

  it("does not let stationary pointer hover override keyboard arrow up selection", async () => {
    installClipboardApi(createManyClips());

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Recent clip 1/
    });
    await act(async () => {
      await Promise.resolve();
    });

    const resultsPane = screen.getByLabelText("Clipboard history results");
    const clipButtons = [1, 2, 3, 4, 5].map((index) => screen.getByRole("button", {
      name: new RegExp(`Restore clipboard item ${index}: Recent clip ${index}`)
    }));
    let scrollTop = 0;

    Object.defineProperty(resultsPane, "clientHeight", { configurable: true, value: 120 });
    Object.defineProperty(resultsPane, "scrollHeight", { configurable: true, value: 475 });
    Object.defineProperty(resultsPane, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (value) => {
        scrollTop = value;
      }
    });
    resultsPane.scrollTo = vi.fn((optionsOrX?: ScrollToOptions | number) => {
      scrollTop = typeof optionsOrX === "number" ? optionsOrX : Number(optionsOrX?.top);
    }) as HTMLDivElement["scrollTo"];
    resultsPane.getBoundingClientRect = vi.fn(() => ({
      bottom: 220,
      height: 120,
      left: 0,
      right: 360,
      top: 100,
      width: 360,
      x: 0,
      y: 100,
      toJSON: () => ({})
    }));
    clipButtons.forEach((button, index) => {
      const row = button.parentElement!;

      Object.defineProperty(row, "offsetHeight", { configurable: true, value: 95 });
      row.getBoundingClientRect = vi.fn(() => ({
        bottom: 100 + (index * 95) + 95 - scrollTop,
        height: 95,
        left: 0,
        right: 360,
        top: 100 + (index * 95) - scrollTop,
        width: 360,
        x: 0,
        y: 100 + (index * 95) - scrollTop,
        toJSON: () => ({})
      }));
    });

    fireEvent.pointerMove(clipButtons[4].parentElement!, { clientX: 20, clientY: 100 });
    await waitFor(() => {
      expect(clipButtons[4]).toHaveAttribute("aria-selected", "true");
    });

    fireEvent.keyDown(window, { key: "ArrowUp" });
    fireEvent.mouseEnter(clipButtons[4].parentElement!);

    await waitFor(() => {
      expect(clipButtons[3]).toHaveAttribute("aria-selected", "true");
      expect(clipButtons[4]).toHaveAttribute("aria-selected", "false");
    });
  });

  it("restores the selected popup item with the paste-with-formatting shortcut", async () => {
    const api = installClipboardApi();

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.keyDown(window, { key: "Enter", metaKey: true, shiftKey: true });

    await waitFor(() => {
      expect(api.restoreClipboardItem).toHaveBeenCalledWith("clip-1");
    });
  });

  it("opens settings from the clipboard popup with Command comma", async () => {
    const api = installClipboardApi();

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });
    fireEvent.keyDown(window, { key: ",", metaKey: true });

    await waitFor(() => {
      expect(api.openSettings).toHaveBeenCalledOnce();
    });
    expect(api.restoreClipboardItem).not.toHaveBeenCalled();
  });

  it("restores visible results with number shortcuts", async () => {
    const api = installClipboardApi();

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 2: GitHub issue link/
    });
    await waitFor(() => {
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: Release checklist/
      })).toHaveAttribute("aria-selected", "true");
    });
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.keyDown(window, { key: "2" });

    await waitFor(() => {
      expect(api.restoreClipboardItem).toHaveBeenCalledWith("clip-2");
    });
  });

  it("dismisses the popup with Escape without restoring clipboard text", async () => {
    const api = installClipboardApi();

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(api.dismissClipboardPopup).toHaveBeenCalledOnce();
    });
    expect(api.restoreClipboardItem).not.toHaveBeenCalled();
  });

  it("refreshes history and focuses search when the clipboard popup opens", async () => {
    const api = installClipboardApi();

    render(<App />);

    const search = screen.getByLabelText("Search clipboard history");
    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });
    api.replaceClips([
      {
        id: "clip-3",
        type: "text",
        text: "Copied while hidden",
        preview: "Copied while hidden",
        capturedAt: new Date(Date.UTC(2026, 4, 1, 13)).toISOString(),
        pinned: false
      }
    ]);

    act(() => {
      api.openPopup();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: Copied while hidden/
      })).toBeInTheDocument();
      expect(search).toHaveFocus();
    });
  });

  it("clears stale search when showing text copied outside the app", async () => {
    const api = installClipboardApi();

    render(<App />);

    const search = screen.getByLabelText("Search clipboard history");
    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });

    fireEvent.change(search, {
      target: { value: "git" }
    });

    await waitFor(() => {
      expect(screen.queryAllByText("Release checklist")).toHaveLength(0);
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: GitHub issue link/
      })).toBeInTheDocument();
    });

    api.replaceClips([
      {
        id: "clip-3",
        type: "text",
        text: "Copied from another app",
        preview: "Copied from another app",
        capturedAt: new Date(Date.UTC(2026, 4, 1, 14)).toISOString(),
        pinned: false
      }
    ]);

    act(() => {
      api.openPopup();
    });

    await waitFor(() => {
      expect(search).toHaveValue("");
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: Copied from another app/
      })).toBeInTheDocument();
    });
  });

  it("updates visible history when clipboard text changes while the popup is mounted", async () => {
    const api = installClipboardApi();

    render(<App />);

    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });

    api.replaceClips([
      {
        id: "clip-3",
        type: "text",
        text: "Copied moments ago",
        preview: "Copied moments ago",
        capturedAt: new Date(Date.UTC(2026, 4, 1, 15)).toISOString(),
        pinned: false
      },
      ...createClips()
    ]);

    act(() => {
      api.emitHistoryChanged();
    });

    await waitFor(() => {
      expect(screen.getByRole("button", {
        name: /Restore clipboard item 1: Copied moments ago/
      })).toBeInTheDocument();
    });
  });
});
