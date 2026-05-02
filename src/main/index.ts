import { join } from "node:path";
import { app, BrowserWindow, globalShortcut, screen, shell } from "electron";
import { is } from "@electron-toolkit/utils";
import {
  captureCurrentClipboardText,
  registerClipboardHistoryIpc,
  sendToLiveWindow,
  startTextClipboardCapture,
  stopTextClipboardCapture
} from "./clipboard-capture";
import { debugLog } from "./debug-log";
import { ensureLiveWindow } from "./popup-window-state";
import { preloadScriptPath } from "./window-paths";
import { positionPopupNearCursor } from "../shared/popup-position";

const popupSize = {
  width: 560,
  height: 620
};

let popupWindow: BrowserWindow | null = null;

function openClipboardPopup(): void {
  debugLog("popup", "open requested");
  popupWindow = ensureLiveWindow(popupWindow, createClipboardPopupWindow);

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const position = positionPopupNearCursor(cursor, display.workArea, popupSize);

  const items = captureCurrentClipboardText({ force: true });
  debugLog("popup", "show popup", {
    historyCount: items.length,
    x: position.x,
    y: position.y,
    width: popupSize.width,
    height: popupSize.height
  });
  popupWindow.setBounds({ ...position, ...popupSize });
  popupWindow.setAlwaysOnTop(true, "floating");
  popupWindow.show();
  popupWindow.focus();
  const sent = sendToLiveWindow(popupWindow, "clipboard-popup:opened", items);
  debugLog("popup", "sent popup opened event", { sent });
}

function registerGlobalHotkey(): void {
  const registered = globalShortcut.register("CommandOrControl+Shift+V", openClipboardPopup);
  debugLog("hotkey", "register global shortcut", { accelerator: "CommandOrControl+Shift+V", registered });

  if (!registered) {
    console.warn("CopClip could not register Command+Shift+V global shortcut.");
  }
}

function createClipboardPopupWindow(): BrowserWindow {
  debugLog("window", "create popup window");
  const window = new BrowserWindow({
    width: popupSize.width,
    height: popupSize.height,
    minWidth: popupSize.width,
    minHeight: popupSize.height,
    title: "CopClip",
    show: false,
    frame: false,
    resizable: false,
    backgroundColor: "#fbfcfd",
    webPreferences: {
      preload: preloadScriptPath(__dirname),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.on("hide", () => {
    debugLog("window", "popup hidden");
    window.setAlwaysOnTop(false);
  });

  window.on("blur", () => {
    debugLog("window", "popup blurred");
    window.hide();
  });

  window.on("closed", () => {
    debugLog("window", "popup closed");
    if (popupWindow === window) {
      popupWindow = null;
    }
  });

  window.webContents.on("did-finish-load", () => {
    debugLog("window", "popup renderer loaded");
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    debugLog("window", "popup renderer failed to load", { errorCode, errorDescription, validatedURL });
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    debugLog("window", "load renderer url", { url: process.env.ELECTRON_RENDERER_URL });
    window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    debugLog("window", "load renderer file");
    window.loadFile(join(__dirname, "../renderer/index.html"));
  }

  return window;
}

app.whenReady().then(() => {
  debugLog("app", "ready");
  registerClipboardHistoryIpc();
  popupWindow = createClipboardPopupWindow();
  registerGlobalHotkey();
  startTextClipboardCapture();

  app.on("activate", () => {
    popupWindow = ensureLiveWindow(popupWindow, createClipboardPopupWindow);
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
