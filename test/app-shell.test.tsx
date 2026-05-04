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
      capturedAt
    },
    {
      id: "clip-2",
      type: "text",
      text: "GitHub issue link",
      preview: "GitHub issue link",
      capturedAt
    }
  ];
}

function createManyClips(): ClipboardItem[] {
  return Array.from({ length: 5 }, (_, index) => ({
    id: `clip-${index + 1}`,
    type: "text" as const,
    text: `Recent clip ${index + 1}`,
    preview: `Recent clip ${index + 1}`,
    capturedAt: new Date(Date.UTC(2026, 4, 1, 12, index)).toISOString()
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
      capturedAt
    },
    {
      id: "clip-image",
      type: "image",
      imageDataUrl: pngDataUrl,
      width: 1,
      height: 1,
      preview: "Image 1x1",
      capturedAt
    }
  ];
}

function installClipboardApi(clips = createClips()) {
  let popupOpenedCallback: ((items: ClipboardItem[]) => void) | undefined;
  let historyChangedCallback: ((items: ClipboardItem[]) => void) | undefined;
  let settingsChangedCallback: ((settings: CopClipSettings) => void) | undefined;
  let currentClips = clips;
  let currentSettings = defaultCopClipSettings;
  const api = {
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
    openPopup: () => {
      popupOpenedCallback?.(currentClips);
    },
    emitHistoryChanged: () => {
      historyChangedCallback?.(currentClips);
    },
    replaceClips: (nextClips: ClipboardItem[]) => {
      currentClips = nextClips;
    },
    restoreClipboardItem: vi.fn(async () => true),
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
        globalHotkey: typeof patch.globalHotkey === "string" ? patch.globalHotkey : currentSettings.globalHotkey,
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
    installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    expect(screen.getByLabelText("CopClip desktop shell")).toBeInTheDocument();
    expect(screen.getByLabelText("CopClip navigation")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Advanced" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Clipboard popup")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("2 clips")).toBeInTheDocument();
      expect(screen.getAllByText("Release checklist").length).toBeGreaterThan(0);
    });
  });

  it("limits the desktop recent clips list to the three latest clips", async () => {
    installClipboardApi(createManyClips());
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("3 shown")).toBeInTheDocument();
      expect(screen.getAllByText("Recent clip 1").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Recent clip 2").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Recent clip 3").length).toBeGreaterThan(0);
      expect(screen.queryAllByText("Recent clip 4")).toHaveLength(0);
      expect(screen.queryAllByText("Recent clip 5")).toHaveLength(0);
    });
  });

  it("renders desktop image clips with the constrained thumbnail class", async () => {
    installClipboardApi([
      {
        id: "clip-image",
        type: "image",
        imageDataUrl: pngDataUrl,
        width: 460,
        height: 996,
        preview: "Image 460x996",
        capturedAt: new Date(Date.UTC(2026, 4, 1, 12)).toISOString()
      }
    ]);
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("IMG · Image 460x996")).toBeInTheDocument();
    });
    expect(document.querySelector(".desktop-clip-thumbnail")).toHaveAttribute("src", pngDataUrl);
  });

  it("updates desktop shell history when clipboard text changes", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("2 clips")).toBeInTheDocument();
    });

    api.replaceClips([
      {
        id: "clip-3",
        type: "text",
        text: "Desktop shell clip",
        preview: "Desktop shell clip",
        capturedAt: new Date(Date.UTC(2026, 4, 1, 16)).toISOString()
      },
      ...createClips()
    ]);

    act(() => {
      api.emitHistoryChanged();
    });

    await waitFor(() => {
      expect(screen.getByText("3 clips")).toBeInTheDocument();
      expect(screen.getAllByText("Desktop shell clip").length).toBeGreaterThan(0);
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
      expect(screen.getByText("IMG")).toBeInTheDocument();
      expect(screen.getAllByText("Image 1x1").length).toBeGreaterThan(0);
    });
    expect(document.querySelector(".clip-image-preview img")).toHaveAttribute("src", pngDataUrl);
  });

  it("documents the intentionally exposed preload API surface", () => {
    expect(exposedApiKeys).toEqual([
      "getAppInfo",
      "dismissClipboardPopup",
      "getSettings",
      "listClipboardHistory",
      "onClipboardHistoryChanged",
      "onClipboardPopupOpened",
      "onSettingsChanged",
      "restoreClipboardItem",
      "updateSettings"
    ]);
  });

  it("allows editing persisted desktop settings", async () => {
    const api = installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    const hotkeyInput = await screen.findByDisplayValue("CommandOrControl+Shift+V");
    fireEvent.change(hotkeyInput, {
      target: {
        value: "CommandOrControl+Alt+V"
      }
    });
    fireEvent.blur(hotkeyInput);

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        globalHotkey: "CommandOrControl+Alt+V"
      });
      expect(screen.getByText("Saved")).toBeInTheDocument();
    });
  });

  it("shows validation feedback for invalid desktop settings", async () => {
    installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

    const historyLimitInput = await screen.findByDisplayValue("100");
    fireEvent.change(historyLimitInput, {
      target: {
        value: "0"
      }
    });
    fireEvent.blur(historyLimitInput);

    await waitFor(() => {
      expect(screen.getByText("Check values")).toBeInTheDocument();
      expect(screen.getByText("Use a number from 1 to 5000.")).toBeInTheDocument();
    });
  });

  it("allows clearing numeric settings fields while editing", async () => {
    installClipboardApi();
    window.history.pushState({}, "", "/?surface=desktop");

    render(<App />);

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
        capturedAt: new Date(Date.UTC(2026, 4, 1, 13)).toISOString()
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
        capturedAt: new Date(Date.UTC(2026, 4, 1, 14)).toISOString()
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
        capturedAt: new Date(Date.UTC(2026, 4, 1, 15)).toISOString()
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
