import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/renderer/src/App";
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

function installClipboardApi(clips = createClips()) {
  let popupOpenedCallback: ((items: ClipboardItem[]) => void) | undefined;
  let historyChangedCallback: ((items: ClipboardItem[]) => void) | undefined;
  let settingsChangedCallback: ((settings: CopClipSettings) => void) | undefined;
  let currentClips = clips;
  let currentSettings = defaultCopClipSettings;
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
            : currentSettings.theme
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

describe("CopClip app shell", () => {
  it("shows the desktop shell for normal app usage", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    expect(screen.getByLabelText("CopClip desktop shell")).toBeInTheDocument();
    expect(screen.getByLabelText("CopClip navigation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /History/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /General/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Privacy/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shortcuts/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Subscription/ })).toBeInTheDocument();
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
    expect(screen.getByText("Ignore Applications")).toBeInTheDocument();

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

    expect(screen.getByRole("heading", { name: "Clipboard history" })).toBeInTheDocument();
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
      expect(screen.getByText("URL")).toBeInTheDocument();
      expect(screen.getByText("HTML")).toBeInTheDocument();
      expect(screen.getByText("IMG")).toBeInTheDocument();
      expect(screen.getAllByText("Formatted release note").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Image 1x1").length).toBeGreaterThan(0);
    });
    expect(document.querySelector(".clip-image-preview img")).toHaveAttribute("src", pngDataUrl);
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
    fireEvent.keyDown(hotkeyInput, { altKey: true, ctrlKey: true, key: "v" });

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        openClipboardHistoryShortcut: "CommandOrControl+Alt+V"
      });
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("updates Maccy-style behavior settings", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /General/ }));
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

    render(<App />);

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
      expect(screen.getAllByText("GitHub issue link").length).toBeGreaterThan(0);
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

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    await waitFor(() => {
      expect(api.clearClipboardHistory).toHaveBeenCalledOnce();
      expect(screen.getByText("Copy text, links, or images to start history")).toBeInTheDocument();
    });
    expect(api.restoreClipboardItem).not.toHaveBeenCalled();
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
      expect(screen.getAllByText("GitHub issue link").length).toBeGreaterThan(0);
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
