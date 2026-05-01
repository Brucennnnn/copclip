import { beforeEach, describe, expect, it, vi } from "vitest";

let clipboardText = "";

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => []
  },
  clipboard: {
    readText: () => clipboardText,
    writeText: vi.fn()
  },
  ipcMain: {
    handle: vi.fn()
  }
}));

describe("clipboard capture", () => {
  beforeEach(() => {
    clipboardText = "";
    vi.resetModules();
  });

  it("can force-capture the startup clipboard when the popup opens", async () => {
    clipboardText = "already copied";
    const {
      captureCurrentClipboardText,
      clipboardHistory,
      startTextClipboardCapture,
      stopTextClipboardCapture
    } = await import("../src/main/clipboard-capture");

    startTextClipboardCapture();
    captureCurrentClipboardText({ force: true });
    stopTextClipboardCapture();
    expect(clipboardHistory.list().map((item) => item.text)).toEqual(["already copied"]);
  });

  it("skips unchanged clipboard text during polling but captures it when forced", async () => {
    clipboardText = "same clipboard text";
    const { captureCurrentClipboardText, clipboardHistory } = await import("../src/main/clipboard-capture");

    captureCurrentClipboardText();
    captureCurrentClipboardText();
    expect(clipboardHistory.list()).toHaveLength(1);

    captureCurrentClipboardText({ force: true });
    expect(clipboardHistory.list()).toHaveLength(1);
    expect(clipboardHistory.list()[0]?.text).toBe("same clipboard text");
  });
});
