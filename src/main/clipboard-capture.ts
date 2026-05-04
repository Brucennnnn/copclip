import { createHash } from "node:crypto";
import { BrowserWindow, clipboard, ipcMain, nativeImage, type IpcMainInvokeEvent } from "electron";
import {
  createClipboardHistory,
  normalizeClipboardText,
  type ClipboardHistory,
  type ClipboardImagePayload,
  type ClipboardItem,
  isClipboardImageWithinLimits,
  maxClipboardImageBytes,
  maxClipboardImagePixels
} from "../shared/clipboard-history";
import { ipcChannels } from "../shared/ipc-channels";
import { schedulePasteIntoTargetApplication } from "./auto-paste";
import { debugLog, textSummary } from "./debug-log";
import type { IpcSenderValidator } from "./renderer-trust";
import type { RendererSurface } from "./window-paths";

export let clipboardHistory: ClipboardHistory = createClipboardHistory();

let clipboardPollTimer: NodeJS.Timeout | null = null;
let lastObservedSignature = "";

type ClipboardHistoryIpcOptions = {
  isTrustedSender: IpcSenderValidator;
};

const allRendererSurfaces = ["desktop", "popup"] as const satisfies readonly RendererSurface[];
const popupRendererSurface = ["popup"] as const satisfies readonly RendererSurface[];

export function configureClipboardHistory(nextClipboardHistory: ClipboardHistory): void {
  clipboardHistory.close?.();
  clipboardHistory = nextClipboardHistory;
}

export function closeClipboardHistory(): void {
  clipboardHistory.close?.();
}

export function sendToLiveWindow(window: BrowserWindow, channel: string, ...args: unknown[]): boolean {
  try {
    if (window.isDestroyed() || window.webContents.isDestroyed() || window.webContents.mainFrame?.isDestroyed()) {
      debugLog("ipc", "skip send to inactive window", { channel });
      return false;
    }

    window.webContents.send(channel, ...args);
    debugLog("ipc", "sent renderer event", { channel });
    return true;
  } catch {
    // A renderer can disappear between safety checks while the polling loop is running.
    debugLog("ipc", "failed to send renderer event", { channel });
    return false;
  }
}

function sendClipboardHistoryChanged(items: ClipboardItem[]): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    sendToLiveWindow(window, ipcChannels.clipboardHistoryChanged, items);
  });
}

function assertTrustedSender(
  event: IpcMainInvokeEvent,
  channel: string,
  allowedSurfaces: readonly RendererSurface[],
  isTrustedSender: IpcSenderValidator
): void {
  if (isTrustedSender(event, allowedSurfaces)) {
    return;
  }

  debugLog("ipc", "reject untrusted renderer ipc", { channel, url: event.senderFrame?.url ?? "" });
  throw new Error("Unauthorized IPC sender.");
}

export function clearClipboardHistory(): ClipboardItem[] {
  clipboardHistory.clear();
  const items = clipboardHistory.list();
  sendClipboardHistoryChanged(items);
  debugLog("capture", "cleared clipboard history");
  return items;
}

export function updateClipboardHistoryLimit(historyLimit: number): ClipboardItem[] {
  clipboardHistory.setHistoryLimit?.(historyLimit);
  const items = clipboardHistory.list();
  sendClipboardHistoryChanged(items);
  debugLog("capture", "updated clipboard history limit", { historyLimit, historyCount: items.length });
  return items;
}

function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function textSignature(text: string): string {
  return `text:${text}`;
}

function imageSignature(buffer: Buffer): string {
  return `image:${hashBuffer(buffer)}`;
}

function imagePayloadFromClipboard(): { payload: ClipboardImagePayload; signature: string } | null {
  const image = clipboard.readImage();

  if (image.isEmpty()) {
    return null;
  }

  const size = image.getSize();

  if (!Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
    return null;
  }

  if (size.width * size.height > maxClipboardImagePixels) {
    debugLog("capture", "skip oversized clipboard image", {
      height: size.height,
      maxPixels: maxClipboardImagePixels,
      width: size.width
    });
    return null;
  }

  const imageData = image.toPNG();

  if (imageData.length === 0) {
    return null;
  }

  if (!isClipboardImageWithinLimits(size.width, size.height, imageData.length)) {
    debugLog("capture", "skip oversized clipboard image", {
      bytes: imageData.length,
      height: size.height,
      maxBytes: maxClipboardImageBytes,
      maxPixels: maxClipboardImagePixels,
      width: size.width
    });
    return null;
  }

  return {
    payload: {
      imageDataUrl: `data:image/png;base64,${imageData.toString("base64")}`,
      width: size.width,
      height: size.height
    },
    signature: imageSignature(imageData)
  };
}

export function captureCurrentClipboardItem(options: { force?: boolean } = {}): ClipboardItem[] {
  const image = imagePayloadFromClipboard();

  if (image) {
    const unchanged = image.signature === lastObservedSignature;
    debugLog("capture", "read clipboard image", {
      force: Boolean(options.force),
      unchanged,
      width: image.payload.width,
      height: image.payload.height
    });

    if (!options.force && unchanged) {
      debugLog("capture", "skip unchanged clipboard", { historyCount: clipboardHistory.list().length });
      return clipboardHistory.list();
    }

    lastObservedSignature = image.signature;

    const capturedItem = clipboardHistory.captureImage(image.payload);
    const items = clipboardHistory.list();

    if (capturedItem) {
      debugLog("capture", "captured clipboard image", { itemId: capturedItem.id, historyCount: items.length });
      sendClipboardHistoryChanged(items);
    } else {
      debugLog("capture", "clipboard image ignored by normalizer", { historyCount: items.length });
    }

    return items;
  }

  const nextText = clipboard.readText();
  const normalizedText = normalizeClipboardText(nextText);
  const nextSignature = normalizedText ? textSignature(normalizedText) : "text:";
  const unchanged = nextSignature === lastObservedSignature;
  debugLog("capture", "read clipboard text", {
    force: Boolean(options.force),
    unchanged,
    ...textSummary(nextText)
  });

  if (!options.force && unchanged) {
    debugLog("capture", "skip unchanged clipboard", { historyCount: clipboardHistory.list().length });
    return clipboardHistory.list();
  }

  lastObservedSignature = nextSignature;

  const capturedItem = clipboardHistory.captureText(nextText);
  const items = clipboardHistory.list();

  if (capturedItem) {
    debugLog("capture", "captured clipboard text", { itemId: capturedItem.id, type: capturedItem.type, historyCount: items.length });
    sendClipboardHistoryChanged(items);
  } else {
    debugLog("capture", "clipboard text ignored by normalizer", { historyCount: items.length });
  }

  return items;
}

export function registerClipboardHistoryIpc({ isTrustedSender }: ClipboardHistoryIpcOptions): void {
  ipcMain.handle(ipcChannels.clipboardHistoryList, (event, query?: string) => {
    assertTrustedSender(event, ipcChannels.clipboardHistoryList, allRendererSurfaces, isTrustedSender);
    const items = clipboardHistory.list(query);
    debugLog("ipc", "list clipboard history", { query: query ?? "", resultCount: items.length });
    return items;
  });

  ipcMain.handle(ipcChannels.clipboardHistoryRestore, (event, id: string) => {
    assertTrustedSender(event, ipcChannels.clipboardHistoryRestore, popupRendererSurface, isTrustedSender);
    const item = clipboardHistory.findById(id);

    if (!item) {
      debugLog("ipc", "restore missed clipboard item", { id });
      return false;
    }

    if (item.type === "image") {
      const image = nativeImage.createFromDataURL(item.imageDataUrl);

      if (image.isEmpty()) {
        debugLog("ipc", "restore image failed", { id });
        return false;
      }

      clipboard.writeImage(image);
      lastObservedSignature = imageSignature(image.toPNG());
    } else {
      clipboard.writeText(item.text);
      lastObservedSignature = textSignature(item.text);
    }

    BrowserWindow.fromWebContents(event.sender)?.hide();
    schedulePasteIntoTargetApplication();
    debugLog("ipc", "restored clipboard item", { id, type: item.type, historyCount: clipboardHistory.list().length });
    return true;
  });

  ipcMain.handle(ipcChannels.clipboardPopupDismiss, (event) => {
    assertTrustedSender(event, ipcChannels.clipboardPopupDismiss, popupRendererSurface, isTrustedSender);
    BrowserWindow.fromWebContents(event.sender)?.hide();
    debugLog("ipc", "dismiss popup");
  });
}

export function startClipboardCapture(intervalMs = 750): void {
  if (clipboardPollTimer) {
    debugLog("capture", "polling already started", { intervalMs });
    return;
  }

  debugLog("capture", "start clipboard polling", { intervalMs });
  captureCurrentClipboardItem({ force: true });
  clipboardPollTimer = setInterval(captureCurrentClipboardItem, intervalMs);
}

export function stopClipboardCapture(): void {
  if (!clipboardPollTimer) {
    return;
  }

  clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
  debugLog("capture", "stop clipboard polling");
}
