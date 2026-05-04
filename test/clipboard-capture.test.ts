import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { maxClipboardImagePixels, type ClipboardItem } from "../src/shared/clipboard-history";
import { ipcChannels } from "../src/shared/ipc-channels";

let clipboardText = "";
const windows: unknown[] = [];
const ipcHandlers = new Map<string, (...args: never[]) => unknown>();
const pngData = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const pngDataUrl = `data:image/png;base64,${pngData}`;
const pngBuffer = Buffer.from(pngData, "base64");
const writeText = vi.fn();
const writeImage = vi.fn();
const hideWindow = vi.fn();
const isTrustedAccessibilityClient = vi.fn(() => true);
const execFile = vi.fn(
  (_file: string, _args: string[], _options: object, callback: (error: Error | null) => void) => {
    callback(null);
    return {};
  }
);
const execFileSync = vi.fn(() => "com.example.Editor\n");
const originalPlatform = process.platform;
const trustAllSenders = () => true;

type MockNativeImage = {
  isEmpty: () => boolean;
  toPNG: () => Buffer;
  getSize: () => { width: number; height: number };
};

function createEmptyImage(): MockNativeImage {
  return {
    isEmpty: () => true,
    toPNG: () => Buffer.alloc(0),
    getSize: () => ({ width: 0, height: 0 })
  };
}

function createClipboardImage(size = { width: 1, height: 1 }): MockNativeImage {
  return {
    isEmpty: () => false,
    toPNG: () => pngBuffer,
    getSize: () => size
  };
}

let clipboardImage = createEmptyImage();

function itemLabels(items: ClipboardItem[]): string[] {
  return items.map((item) => (item.type === "image" ? item.preview : item.text));
}

function stubPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform
  });
}

vi.mock("electron", () => ({
  BrowserWindow: {
    fromWebContents: () => ({ hide: hideWindow }),
    getAllWindows: () => windows
  },
  clipboard: {
    readImage: () => clipboardImage,
    readText: () => clipboardText,
    writeImage,
    writeText
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: never[]) => unknown) => {
      ipcHandlers.set(channel, handler);
    })
  },
  nativeImage: {
    createFromDataURL: vi.fn((dataUrl: string) => (dataUrl === pngDataUrl ? createClipboardImage() : createEmptyImage()))
  },
  systemPreferences: {
    isTrustedAccessibilityClient
  }
}));

vi.mock("node:child_process", () => ({
  default: {
    execFile,
    execFileSync
  },
  execFile,
  execFileSync
}));

describe("clipboard capture", () => {
  beforeEach(() => {
    stubPlatform(originalPlatform);
    clipboardText = "";
    clipboardImage = createEmptyImage();
    windows.length = 0;
    ipcHandlers.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
    isTrustedAccessibilityClient.mockReturnValue(true);
    execFile.mockImplementation(
      (_file: string, _args: string[], _options: object, callback: (error: Error | null) => void) => {
        callback(null);
        return {};
      }
    );
    execFileSync.mockReturnValue("com.example.Editor\n");
    vi.resetModules();
  });

  afterEach(() => {
    stubPlatform(originalPlatform);
    vi.useRealTimers();
  });

  it("can force-capture the startup clipboard when the popup opens", async () => {
    clipboardText = "already copied";
    const {
      captureCurrentClipboardItem,
      clipboardHistory,
      startClipboardCapture,
      stopClipboardCapture
    } = await import("../src/main/clipboard-capture");

    startClipboardCapture();
    const items = captureCurrentClipboardItem({ force: true });
    stopClipboardCapture();
    expect(itemLabels(items)).toEqual(["already copied"]);
    expect(itemLabels(clipboardHistory.list())).toEqual(["already copied"]);
  });

  it("captures the current clipboard when polling starts", async () => {
    clipboardText = "copied before launch";
    const { clipboardHistory, startClipboardCapture, stopClipboardCapture } = await import("../src/main/clipboard-capture");

    startClipboardCapture();
    stopClipboardCapture();

    expect(itemLabels(clipboardHistory.list())).toEqual(["copied before launch"]);
  });

  it("skips unchanged clipboard text during polling but captures it when forced", async () => {
    clipboardText = "same clipboard text";
    const { captureCurrentClipboardItem, clipboardHistory } = await import("../src/main/clipboard-capture");

    captureCurrentClipboardItem();
    captureCurrentClipboardItem();
    expect(clipboardHistory.list()).toHaveLength(1);

    captureCurrentClipboardItem({ force: true });
    expect(clipboardHistory.list()).toHaveLength(1);
    expect(itemLabels(clipboardHistory.list())).toEqual(["same clipboard text"]);
  });

  it("captures clipboard images before falling back to text", async () => {
    clipboardText = "image fallback text";
    clipboardImage = createClipboardImage();
    const { captureCurrentClipboardItem, clipboardHistory } = await import("../src/main/clipboard-capture");

    captureCurrentClipboardItem({ force: true });

    expect(clipboardHistory.list()[0]).toMatchObject({
      type: "image",
      preview: "Image 1x1",
      imageDataUrl: pngDataUrl,
      width: 1,
      height: 1
    });
  });

  it("skips oversized clipboard images before falling back to text", async () => {
    clipboardText = "fallback text";
    const toPNG = vi.fn(() => pngBuffer);
    clipboardImage = {
      isEmpty: () => false,
      toPNG,
      getSize: () => ({ width: maxClipboardImagePixels + 1, height: 1 })
    };
    const { captureCurrentClipboardItem, clipboardHistory } = await import("../src/main/clipboard-capture");

    captureCurrentClipboardItem({ force: true });

    expect(itemLabels(clipboardHistory.list())).toEqual(["fallback text"]);
    expect(toPNG).not.toHaveBeenCalled();
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
    const { captureCurrentClipboardItem } = await import("../src/main/clipboard-capture");

    expect(() => captureCurrentClipboardItem({ force: true })).not.toThrow();
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

    expect(sendToLiveWindow(window as never, ipcChannels.clipboardPopupOpened)).toBe(true);
    expect(send).toHaveBeenCalledWith(ipcChannels.clipboardPopupOpened);
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
    const { captureCurrentClipboardItem } = await import("../src/main/clipboard-capture");

    captureCurrentClipboardItem();

    expect(send).toHaveBeenCalledWith(
      ipcChannels.clipboardHistoryChanged,
      expect.arrayContaining([
        expect.objectContaining({
          text: "copied outside the app"
        })
      ])
    );
  });

  it("restores text history items and auto-pastes into the previous app", async () => {
    stubPlatform("darwin");
    vi.useFakeTimers();
    clipboardText = "paste me";
    const { capturePasteTargetApplication } = await import("../src/main/auto-paste");
    const { captureCurrentClipboardItem, registerClipboardHistoryIpc } = await import("../src/main/clipboard-capture");

    capturePasteTargetApplication();
    const [item] = captureCurrentClipboardItem({ force: true });
    registerClipboardHistoryIpc({ isTrustedSender: trustAllSenders });
    const restore = ipcHandlers.get(ipcChannels.clipboardHistoryRestore);

    expect(restore?.({ sender: {} } as never, item.id as never)).toBe(true);
    expect(writeText).toHaveBeenCalledWith("paste me");
    expect(hideWindow).toHaveBeenCalledOnce();
    expect(isTrustedAccessibilityClient).toHaveBeenCalledWith(true);

    await vi.advanceTimersByTimeAsync(120);

    expect(execFileSync).toHaveBeenCalledWith(
      "/usr/bin/osascript",
      ["-e", "id of application (path to frontmost application as text)"],
      expect.objectContaining({ encoding: "utf8", timeout: 1000 })
    );
    expect(execFile).toHaveBeenCalledWith(
      "/usr/bin/osascript",
      ["-e", expect.stringContaining('tell application id "com.example.Editor" to activate')],
      { timeout: 3000 },
      expect.any(Function)
    );
  });

  it("restores image history items and auto-pastes into the previous app", async () => {
    stubPlatform("darwin");
    vi.useFakeTimers();
    clipboardImage = createClipboardImage();
    const { capturePasteTargetApplication } = await import("../src/main/auto-paste");
    const { captureCurrentClipboardItem, registerClipboardHistoryIpc } = await import("../src/main/clipboard-capture");

    capturePasteTargetApplication();
    const [item] = captureCurrentClipboardItem({ force: true });
    registerClipboardHistoryIpc({ isTrustedSender: trustAllSenders });
    const restore = ipcHandlers.get(ipcChannels.clipboardHistoryRestore);

    expect(restore?.({ sender: {} } as never, item.id as never)).toBe(true);
    expect(writeImage).toHaveBeenCalledWith(expect.objectContaining({ isEmpty: expect.any(Function) }));
    expect(hideWindow).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(120);

    expect(execFile).toHaveBeenCalledWith(
      "/usr/bin/osascript",
      ["-e", expect.stringContaining('tell application id "com.example.Editor" to activate')],
      { timeout: 3000 },
      expect.any(Function)
    );
  });

  it("still restores clipboard text when accessibility permission blocks auto-paste", async () => {
    stubPlatform("darwin");
    vi.useFakeTimers();
    isTrustedAccessibilityClient.mockReturnValue(false);
    clipboardText = "copied but not pasted";
    const { captureCurrentClipboardItem, registerClipboardHistoryIpc } = await import("../src/main/clipboard-capture");

    const [item] = captureCurrentClipboardItem({ force: true });
    registerClipboardHistoryIpc({ isTrustedSender: trustAllSenders });
    const restore = ipcHandlers.get(ipcChannels.clipboardHistoryRestore);

    expect(restore?.({ sender: {} } as never, item.id as never)).toBe(true);
    expect(writeText).toHaveBeenCalledWith("copied but not pasted");
    expect(hideWindow).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(120);

    expect(execFile).not.toHaveBeenCalled();
  });

  it("restores clipboard text without pasting when automatic paste is disabled", async () => {
    stubPlatform("darwin");
    vi.useFakeTimers();
    clipboardText = "copy only";
    const { configureAutoPaste } = await import("../src/main/auto-paste");
    const { captureCurrentClipboardItem, registerClipboardHistoryIpc } = await import("../src/main/clipboard-capture");

    configureAutoPaste({ pasteAutomatically: false });
    const [item] = captureCurrentClipboardItem({ force: true });
    registerClipboardHistoryIpc({ isTrustedSender: trustAllSenders });
    const restore = ipcHandlers.get(ipcChannels.clipboardHistoryRestore);

    expect(restore?.({ sender: {} } as never, item.id as never)).toBe(true);
    expect(writeText).toHaveBeenCalledWith("copy only");

    await vi.advanceTimersByTimeAsync(120);

    expect(execFile).not.toHaveBeenCalled();
  });

  it("rejects clipboard history IPC from untrusted renderer senders", async () => {
    const { registerClipboardHistoryIpc } = await import("../src/main/clipboard-capture");
    const isTrustedSender = vi.fn(() => false);

    registerClipboardHistoryIpc({ isTrustedSender });
    const list = ipcHandlers.get(ipcChannels.clipboardHistoryList);
    const event = {
      senderFrame: {
        url: "https://evil.example/"
      }
    };

    expect(() => list?.(event as never, "" as never)).toThrow("Unauthorized IPC sender.");
    expect(isTrustedSender).toHaveBeenCalledWith(event, ["desktop", "popup"]);
  });
});
