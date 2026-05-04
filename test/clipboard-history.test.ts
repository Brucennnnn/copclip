import { describe, expect, it } from "vitest";
import {
  type ClipboardItem,
  createClipboardHistory,
  isClipboardImageWithinLimits,
  maxClipboardImageBytes,
  maxClipboardImagePixels,
  normalizeClipboardImage,
  normalizeClipboardLink,
  normalizeClipboardText,
  previewText
} from "../src/shared/clipboard-history";

const pngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

function itemLabels(items: ClipboardItem[]): string[] {
  return items.map((item) => (item.type === "image" ? item.preview : item.text));
}

describe("clipboard text history", () => {
  it("rejects empty text after trimming whitespace", () => {
    expect(normalizeClipboardText(" \n\t ")).toBeNull();
  });

  it("recognizes copied http and https links", () => {
    expect(normalizeClipboardLink("https://example.com/docs")).toBe("https://example.com/docs");
    expect(normalizeClipboardLink("ftp://example.com/file")).toBeNull();
    expect(normalizeClipboardLink("https://example.com/docs and text")).toBeNull();
  });

  it("keeps captured text ordered by most recent first", () => {
    let timestamp = 0;
    const history = createClipboardHistory({
      now: () => new Date(Date.UTC(2026, 4, 1, 12, timestamp++)),
      createId: () => `clip-${timestamp}`
    });

    history.captureText("first");
    history.captureText("second");

    expect(itemLabels(history.list())).toEqual(["second", "first"]);
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

    expect(itemLabels(history.list())).toEqual(["alpha", "beta"]);
    expect(repeated?.id).toBe(first?.id);
  });

  it("captures copied links with a URL type", () => {
    const history = createClipboardHistory({ createId: () => "clip-link" });

    const item = history.captureText("https://example.com/docs");

    expect(item).toMatchObject({
      id: "clip-link",
      type: "link",
      text: "https://example.com/docs",
      url: "https://example.com/docs"
    });
  });

  it("captures and deduplicates copied images", () => {
    let timestamp = 0;
    const history = createClipboardHistory({
      now: () => new Date(Date.UTC(2026, 4, 1, 12, timestamp++)),
      createId: () => `clip-${timestamp}`
    });

    const first = history.captureImage({ imageDataUrl: pngDataUrl, width: 1, height: 1 });
    const repeated = history.captureImage({ imageDataUrl: pngDataUrl, width: 1, height: 1 });

    expect(repeated?.id).toBe(first?.id);
    expect(history.list()).toEqual([
      expect.objectContaining({
        type: "image",
        preview: "Image 1x1",
        imageDataUrl: pngDataUrl,
        width: 1,
        height: 1
      })
    ]);
  });

  it("rejects invalid or oversized copied images", () => {
    expect(normalizeClipboardImage({ imageDataUrl: "data:image/png;base64,not-valid", width: 1, height: 1 })).toBeNull();
    expect(normalizeClipboardImage({ imageDataUrl: pngDataUrl, width: maxClipboardImagePixels + 1, height: 1 })).toBeNull();
    expect(isClipboardImageWithinLimits(1, 1, maxClipboardImageBytes + 1)).toBe(false);
    expect(isClipboardImageWithinLimits(1, 1, maxClipboardImageBytes)).toBe(true);
  });

  it("filters text history immediately with case-insensitive search", () => {
    const history = createClipboardHistory();

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.captureText("Clipboard manager");

    expect(itemLabels(history.list("git"))).toEqual(["GitHub issue"]);
    expect(itemLabels(history.list("CLIP"))).toEqual(["Clipboard manager"]);
  });

  it("clears all text history", () => {
    const history = createClipboardHistory();

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.clear();

    expect(history.list()).toEqual([]);
  });

  it("prunes existing text history when the limit changes", () => {
    const history = createClipboardHistory({ historyLimit: 5 });

    history.captureText("First");
    history.captureText("Second");
    history.captureText("Third");
    history.setHistoryLimit?.(2);

    expect(itemLabels(history.list())).toEqual(["Third", "Second"]);
  });

  it("creates readable single-line truncated previews", () => {
    expect(previewText("one\n\n two\tthree", 20)).toBe("one two three");
    expect(previewText("This is a long clipboard entry", 15)).toBe("This is a lo...");
  });
});
