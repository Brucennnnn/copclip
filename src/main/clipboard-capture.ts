import { BrowserWindow, clipboard, ipcMain } from "electron";
import { createClipboardHistory, type ClipboardTextItem } from "../shared/clipboard-history";

export const clipboardHistory = createClipboardHistory();

const clipboardHistoryChangedChannel = "clipboard-history:changed";
let clipboardPollTimer: NodeJS.Timeout | null = null;
let lastObservedText = "";

function broadcastClipboardHistoryChanged(): void {
  const items = clipboardHistory.list();

  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(clipboardHistoryChangedChannel, items);
  }
}

export function captureCurrentClipboardText(options: { force?: boolean } = {}): ClipboardTextItem[] {
  const nextText = clipboard.readText();

  if (!options.force && nextText === lastObservedText) {
    return clipboardHistory.list();
  }

  lastObservedText = nextText;

  const captured = clipboardHistory.captureText(nextText);

  if (captured) {
    broadcastClipboardHistoryChanged();
  }

  return clipboardHistory.list();
}

export function registerClipboardHistoryIpc(): void {
  ipcMain.handle("clipboard-history:list", (_event, query?: string) => {
    return clipboardHistory.list(query);
  });

  ipcMain.handle("clipboard-history:restore", (event, id: string) => {
    const item = clipboardHistory.findById(id);

    if (!item) {
      return false;
    }

    clipboard.writeText(item.text);
    lastObservedText = item.text;
    BrowserWindow.fromWebContents(event.sender)?.hide();
    return true;
  });

  ipcMain.handle("clipboard-popup:dismiss", (event) => {
    BrowserWindow.fromWebContents(event.sender)?.hide();
  });
}

export function startTextClipboardCapture(intervalMs = 750): void {
  if (clipboardPollTimer) {
    return;
  }

  lastObservedText = clipboard.readText();

  clipboardPollTimer = setInterval(captureCurrentClipboardText, intervalMs);
}

export function stopTextClipboardCapture(): void {
  if (!clipboardPollTimer) {
    return;
  }

  clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
}
