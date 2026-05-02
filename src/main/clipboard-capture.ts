import { BrowserWindow, clipboard, ipcMain } from "electron";
import { createClipboardHistory, type ClipboardHistory, type ClipboardTextItem } from "../shared/clipboard-history";
import { debugLog, textSummary } from "./debug-log";

export let clipboardHistory: ClipboardHistory = createClipboardHistory();

let clipboardPollTimer: NodeJS.Timeout | null = null;
let lastObservedText = "";

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

function sendClipboardHistoryChanged(items: ClipboardTextItem[]): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    sendToLiveWindow(window, "clipboard-history:changed", items);
  });
}

export function clearClipboardHistory(): ClipboardTextItem[] {
  clipboardHistory.clear();
  const items = clipboardHistory.list();
  sendClipboardHistoryChanged(items);
  debugLog("capture", "cleared clipboard history");
  return items;
}

export function captureCurrentClipboardText(options: { force?: boolean } = {}): ClipboardTextItem[] {
  const nextText = clipboard.readText();
  const unchanged = nextText === lastObservedText;
  debugLog("capture", "read clipboard text", {
    force: Boolean(options.force),
    unchanged,
    ...textSummary(nextText)
  });

  if (!options.force && unchanged) {
    debugLog("capture", "skip unchanged clipboard", { historyCount: clipboardHistory.list().length });
    return clipboardHistory.list();
  }

  lastObservedText = nextText;

  const capturedItem = clipboardHistory.captureText(nextText);
  const items = clipboardHistory.list();

  if (capturedItem) {
    debugLog("capture", "captured clipboard text", { itemId: capturedItem.id, historyCount: items.length });
    sendClipboardHistoryChanged(items);
  } else {
    debugLog("capture", "clipboard text ignored by normalizer", { historyCount: items.length });
  }

  return items;
}

export function registerClipboardHistoryIpc(): void {
  ipcMain.handle("clipboard-history:list", (_event, query?: string) => {
    const items = clipboardHistory.list(query);
    debugLog("ipc", "list clipboard history", { query: query ?? "", resultCount: items.length });
    return items;
  });

  ipcMain.handle("clipboard-history:restore", (event, id: string) => {
    const item = clipboardHistory.findById(id);

    if (!item) {
      debugLog("ipc", "restore missed clipboard item", { id });
      return false;
    }

    clipboard.writeText(item.text);
    lastObservedText = item.text;
    BrowserWindow.fromWebContents(event.sender)?.hide();
    debugLog("ipc", "restored clipboard item", { id, historyCount: clipboardHistory.list().length });
    return true;
  });

  ipcMain.handle("clipboard-popup:dismiss", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide();
    debugLog("ipc", "dismiss popup");
  });
}

export function startTextClipboardCapture(intervalMs = 750): void {
  if (clipboardPollTimer) {
    debugLog("capture", "polling already started", { intervalMs });
    return;
  }

  debugLog("capture", "start clipboard polling", { intervalMs });
  captureCurrentClipboardText({ force: true });
  clipboardPollTimer = setInterval(captureCurrentClipboardText, intervalMs);
}

export function stopTextClipboardCapture(): void {
  if (!clipboardPollTimer) {
    return;
  }

  clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
  debugLog("capture", "stop clipboard polling");
}
