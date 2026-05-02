import { describe, expect, it } from "vitest";
import {
  createClipboardHistory,
  normalizeClipboardText,
  previewText
} from "../src/shared/clipboard-history";

describe("clipboard text history", () => {
  it("rejects empty text after trimming whitespace", () => {
    expect(normalizeClipboardText(" \n\t ")).toBeNull();
  });

  it("keeps captured text ordered by most recent first", () => {
    let timestamp = 0;
    const history = createClipboardHistory({
      now: () => new Date(Date.UTC(2026, 4, 1, 12, timestamp++)),
      createId: () => `clip-${timestamp}`
    });

    history.captureText("first");
    history.captureText("second");

    expect(history.list().map((item) => item.text)).toEqual(["second", "first"]);
  });

  it("deduplicates repeated text without adding clutter", () => {
    let timestamp = 0;
    const history = createClipboardHistory({
      now: () => new Date(Date.UTC(2026, 4, 1, 12, timestamp++)),
      createId: () => `clip-${timestamp}`
    });

    const first = history.captureText("alpha");
    history.captureText("beta");
    const repeated = history.captureText("alpha");

    expect(history.list().map((item) => item.text)).toEqual(["alpha", "beta"]);
    expect(repeated?.id).toBe(first?.id);
  });

  it("filters text history immediately with case-insensitive search", () => {
    const history = createClipboardHistory();

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.captureText("Clipboard manager");

    expect(history.list("git").map((item) => item.text)).toEqual(["GitHub issue"]);
    expect(history.list("CLIP").map((item) => item.text)).toEqual(["Clipboard manager"]);
  });

  it("clears all text history", () => {
    const history = createClipboardHistory();

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.clear();

    expect(history.list()).toEqual([]);
  });

  it("creates readable single-line truncated previews", () => {
    expect(previewText("one\n\n two\tthree", 20)).toBe("one two three");
    expect(previewText("This is a long clipboard entry", 15)).toBe("This is a lo...");
  });
});
