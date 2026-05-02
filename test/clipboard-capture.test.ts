import { beforeEach, describe, expect, it, vi } from "vitest";

let clipboardText = "";
const windows: unknown[] = [];

vi.mock("electron", () => ({
  BrowserWindow: {
    getAllWindows: () => windows
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
    windows.length = 0;
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
    const items = captureCurrentClipboardText({ force: true });
    stopTextClipboardCapture();
    expect(items.map((item) => item.text)).toEqual(["already copied"]);
    expect(clipboardHistory.list().map((item) => item.text)).toEqual(["already copied"]);
  });

  it("captures the current clipboard when polling starts", async () => {
    clipboardText = "copied before launch";
    const { clipboardHistory, startTextClipboardCapture, stopTextClipboardCapture } = await import("../src/main/clipboard-capture");

    startTextClipboardCapture();
    stopTextClipboardCapture();

    expect(clipboardHistory.list().map((item) => item.text)).toEqual(["copied before launch"]);
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

  it("captures clipboard text without sending into renderer frames", async () => {
    clipboardText = "copied outside the app";
    const send = vi.fn(() => {
      throw new Error("Render frame was disposed before WebFrameMain could be accessed");
    });
    windows.push({
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        mainFrame: {
          isDestroyed: () => true
        },
        send
      }
    });
    const { captureCurrentClipboardText } = await import("../src/main/clipboard-capture");

    expect(() => captureCurrentClipboardText({ force: true })).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  it("safely sends popup events to live renderer frames", async () => {
    const send = vi.fn();
    const window = {
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        mainFrame: {
          isDestroyed: () => false
        },
        send
      }
    };
    const { sendToLiveWindow } = await import("../src/main/clipboard-capture");

    expect(sendToLiveWindow(window as never, "clipboard-popup:opened")).toBe(true);
    expect(send).toHaveBeenCalledWith("clipboard-popup:opened");
  });

  it("notifies live popup windows when clipboard text changes", async () => {
    clipboardText = "copied outside the app";
    const send = vi.fn();
    windows.push({
      isDestroyed: () => false,
      webContents: {
        isDestroyed: () => false,
        mainFrame: {
          isDestroyed: () => false
        },
        send
      }
    });
    const { captureCurrentClipboardText } = await import("../src/main/clipboard-capture");

    captureCurrentClipboardText();

    expect(send).toHaveBeenCalledWith(
      "clipboard-history:changed",
      expect.arrayContaining([
        expect.objectContaining({
          text: "copied outside the app"
        })
      ])
    );
  });
});
