import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../src/renderer/src/App";
import { exposedApiKeys } from "../src/preload/api";
import type { ClipboardTextItem } from "../src/shared/clipboard-history";

afterEach(() => {
  delete window.copclip;
});

describe("CopClip app shell", () => {
  it("shows the clipboard popup and settings placeholders", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: "Clipboard history" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Clipboard popup placeholder")).toBeInTheDocument();
    expect(screen.getByLabelText("Search clipboard history")).toBeEnabled();
  });

  it("documents the intentionally exposed preload API surface", () => {
    expect(exposedApiKeys).toEqual([
      "getAppInfo",
      "listClipboardHistory",
      "onClipboardHistoryChanged"
    ]);
  });

  it("filters visible text clipboard history as the user types", async () => {
    const capturedAt = new Date(Date.UTC(2026, 4, 1, 12)).toISOString();
    const clips: ClipboardTextItem[] = [
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

    window.copclip = {
      getAppInfo: () => ({ name: "CopClip", version: "0.1.0", platform: "darwin" }),
      listClipboardHistory: vi.fn(async (query = "") => {
        const normalizedQuery = query.toLocaleLowerCase();
        return normalizedQuery
          ? clips.filter((item) => item.text.toLocaleLowerCase().includes(normalizedQuery))
          : clips;
      }),
      onClipboardHistoryChanged: vi.fn(() => () => undefined)
    };

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
});
