import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/renderer/src/App";
import { exposedApiKeys } from "../src/preload/api";
import type { ClipboardTextItem } from "../src/shared/clipboard-history";

afterEach(() => {
  cleanup();
  delete window.copclip;
});

function createClips(): ClipboardTextItem[] {
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

function installClipboardApi(clips = createClips()) {
  let popupOpenedCallback: (() => void) | undefined;
  const api = {
    getAppInfo: () => ({ name: "CopClip", version: "0.1.0", platform: "darwin" as const }),
    dismissClipboardPopup: vi.fn(async () => undefined),
    listClipboardHistory: vi.fn(async (query = "") => {
      const normalizedQuery = query.toLocaleLowerCase();
      return normalizedQuery
        ? clips.filter((item) => item.text.toLocaleLowerCase().includes(normalizedQuery))
        : clips;
    }),
    onClipboardHistoryChanged: vi.fn(() => () => undefined),
    onClipboardPopupOpened: vi.fn((callback: () => void) => {
      popupOpenedCallback = callback;
      return () => undefined;
    }),
    openPopup: () => {
      popupOpenedCallback?.();
    },
    restoreClipboardItem: vi.fn(async () => true)
  };

  window.copclip = api;
  return api;
}

describe("CopClip app shell", () => {
  it("shows the compact clipboard popup without the full window shell", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Clipboard history" })).toBeInTheDocument();
    expect(screen.getByLabelText("Clipboard popup")).toBeInTheDocument();
    expect(screen.getByLabelText("Close clipboard popup")).toBeEnabled();
    expect(screen.getByLabelText("Search clipboard history")).toBeEnabled();
    expect(screen.queryByRole("heading", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("CopClip navigation")).not.toBeInTheDocument();
  });

  it("documents the intentionally exposed preload API surface", () => {
    expect(exposedApiKeys).toEqual([
      "getAppInfo",
      "dismissClipboardPopup",
      "listClipboardHistory",
      "onClipboardHistoryChanged",
      "onClipboardPopupOpened",
      "restoreClipboardItem"
    ]);
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

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(githubItem).toHaveAttribute("aria-selected", "true");

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

  it("dismisses the popup with the close button without restoring clipboard text", async () => {
    const api = installClipboardApi();

    render(<App />);

    fireEvent.click(screen.getByLabelText("Close clipboard popup"));

    await waitFor(() => {
      expect(api.dismissClipboardPopup).toHaveBeenCalledOnce();
    });
    expect(api.restoreClipboardItem).not.toHaveBeenCalled();
  });

  it("focuses search when the clipboard popup opens", async () => {
    const api = installClipboardApi();

    render(<App />);

    const search = screen.getByLabelText("Search clipboard history");
    await screen.findByRole("button", {
      name: /Restore clipboard item 1: Release checklist/
    });

    api.openPopup();

    expect(search).toHaveFocus();
  });
});
