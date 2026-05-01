import { BrowserWindow, clipboard, ipcMain } from "electron";
import { createClipboardHistory } from "../shared/clipboard-history";

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

export function registerClipboardHistoryIpc(): void {
  ipcMain.handle("clipboard-history:list", (_event, query?: string) => {
    return clipboardHistory.list(query);
  });
}

export function startTextClipboardCapture(intervalMs = 750): void {
  if (clipboardPollTimer) {
    return;
  }

  lastObservedText = clipboard.readText();

  clipboardPollTimer = setInterval(() => {
    const nextText = clipboard.readText();

    if (nextText === lastObservedText) {
      return;
    }

    lastObservedText = nextText;

    const captured = clipboardHistory.captureText(nextText);

    if (captured) {
      broadcastClipboardHistoryChanged();
    }
  }, intervalMs);
}

export function stopTextClipboardCapture(): void {
  if (!clipboardPollTimer) {
    return;
  }

  clearInterval(clipboardPollTimer);
  clipboardPollTimer = null;
}
