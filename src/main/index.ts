import { join } from "node:path";
import { app, BrowserWindow, globalShortcut, screen, shell } from "electron";
import { is } from "@electron-toolkit/utils";
import {
  registerClipboardHistoryIpc,
  startTextClipboardCapture,
  stopTextClipboardCapture
} from "./clipboard-capture";
import { positionPopupNearCursor } from "../shared/popup-position";

const popupSize = {
  width: 900,
  height: 620
};

let popupWindow: BrowserWindow | null = null;

function openClipboardPopup(): void {
  if (!popupWindow) {
    return;
  }

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const position = positionPopupNearCursor(cursor, display.workArea, popupSize);

  popupWindow.setBounds({ ...position, ...popupSize });
  popupWindow.setAlwaysOnTop(true, "floating");
  popupWindow.show();
  popupWindow.focus();
  popupWindow.webContents.send("clipboard-popup:opened");
}

function registerGlobalHotkey(): void {
  const registered = globalShortcut.register("CommandOrControl+Shift+V", openClipboardPopup);

  if (!registered) {
    console.warn("CopClip could not register Command+Shift+V global shortcut.");
  }
}

function createClipboardPopupWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: popupSize.width,
    height: popupSize.height,
    minWidth: popupSize.width,
    minHeight: popupSize.height,
    title: "CopClip",
    show: false,
    backgroundColor: "#fbfcfd",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.on("hide", () => {
    window.setAlwaysOnTop(false);
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  registerClipboardHistoryIpc();
  popupWindow = createClipboardPopupWindow();
  registerGlobalHotkey();
  startTextClipboardCapture();

  app.on("activate", () => {
    if (!popupWindow || popupWindow.isDestroyed()) {
      popupWindow = createClipboardPopupWindow();
    }

    openClipboardPopup();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  stopTextClipboardCapture();
});
