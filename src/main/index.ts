import { join } from "node:path";
import { app, BrowserWindow, globalShortcut, Menu, nativeImage, screen, shell, Tray } from "electron";
import { is } from "@electron-toolkit/utils";
import {
  captureCurrentClipboardText,
  closeClipboardHistory,
  configureClipboardHistory,
  clearClipboardHistory,
  registerClipboardHistoryIpc,
  sendToLiveWindow,
  startTextClipboardCapture,
  stopTextClipboardCapture
} from "./clipboard-capture";
import { debugLog } from "./debug-log";
import { buildMenuBarTemplate } from "./menu-bar";
import { ensureLiveWindow } from "./popup-window-state";
import { createSqliteClipboardHistory } from "./sqlite-clipboard-history";
import { preloadScriptPath, rendererDevUrl, type RendererSurface } from "./window-paths";
import { positionPopupNearCursor } from "../shared/popup-position";

const desktopSize = {
  width: 1040,
  height: 720
};

const popupSize = {
  width: 400,
  height: 500
};

let desktopWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;
let menuBarTray: Tray | null = null;
let capturePaused = false;
let dockHidden = false;

function showDesktopShell(): void {
  debugLog("desktop", "show requested");
  desktopWindow = ensureLiveWindow(desktopWindow, createDesktopShellWindow);

  desktopWindow.show();
  desktopWindow.focus();
}

function showDesktopShellSection(section: "settings" | "privacy"): void {
  showDesktopShell();
  desktopWindow?.webContents.executeJavaScript(`window.location.hash = ${JSON.stringify(section)}`);
}

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

function createTrayIcon() {
  return nativeImage.createFromDataURL(
    `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
        <rect x="3" y="2" width="12" height="14" rx="3" fill="black"/>
        <rect x="6" y="5" width="6" height="1.5" rx="0.75" fill="white"/>
        <rect x="6" y="8" width="6" height="1.5" rx="0.75" fill="white"/>
        <rect x="6" y="11" width="4" height="1.5" rx="0.75" fill="white"/>
      </svg>
    `)}`
  );
}

function refreshMenuBarMenu(): void {
  if (!menuBarTray) {
    return;
  }

  const menu = Menu.buildFromTemplate(
    buildMenuBarTemplate(
      {
        capturePaused,
        dockHidden
      },
      {
        clearHistory: () => {
          clearClipboardHistory();
        },
        hideDock: () => {
          app.dock?.hide();
          dockHidden = true;
        },
        openDesktopShell: showDesktopShell,
        openPopup: openClipboardPopup,
        pauseCapture: () => {
          stopTextClipboardCapture();
          capturePaused = true;
        },
        quit: () => {
          app.quit();
        },
        resumeCapture: () => {
          startTextClipboardCapture();
          capturePaused = false;
        },
        showDock: () => {
          app.dock?.show();
          dockHidden = false;
        },
        showPrivacy: () => {
          showDesktopShellSection("privacy");
        },
        showSettings: () => {
          showDesktopShellSection("settings");
        }
      },
      refreshMenuBarMenu
    )
  );

  menuBarTray.setContextMenu(menu);
}

function createMenuBarController(): void {
  menuBarTray = new Tray(createTrayIcon());
  menuBarTray.setToolTip("CopClip");
  menuBarTray.setTitle("CopClip");
  refreshMenuBarMenu();
}

function loadRendererSurface(window: BrowserWindow, surface: RendererSurface): void {
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    const url = rendererDevUrl(process.env.ELECTRON_RENDERER_URL, surface);
    debugLog("window", "load renderer url", { surface, url });
    window.loadURL(url);
  } else {
    debugLog("window", "load renderer file", { surface });
    window.loadFile(join(__dirname, "../renderer/index.html"), {
      query: {
        surface
      }
    });
  }
}

function configureExternalLinks(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

function createDesktopShellWindow(): BrowserWindow {
  debugLog("window", "create desktop shell window");
  const window = new BrowserWindow({
    width: desktopSize.width,
    height: desktopSize.height,
    minWidth: 860,
    minHeight: 560,
    title: "CopClip",
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: preloadScriptPath(__dirname),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.on("closed", () => {
    debugLog("window", "desktop shell closed");
    if (desktopWindow === window) {
      desktopWindow = null;
    }
  });

  window.webContents.on("did-finish-load", () => {
    debugLog("window", "desktop renderer loaded");
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    debugLog("window", "desktop renderer failed to load", { errorCode, errorDescription, validatedURL });
  });

  configureExternalLinks(window);
  loadRendererSurface(window, "desktop");

  return window;
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

  configureExternalLinks(window);
  loadRendererSurface(window, "popup");

  return window;
}

app.whenReady().then(() => {
  debugLog("app", "ready");
  configureClipboardHistory(createSqliteClipboardHistory(join(app.getPath("userData"), "clipboard-history.sqlite")));
  registerClipboardHistoryIpc();
  desktopWindow = createDesktopShellWindow();
  popupWindow = createClipboardPopupWindow();
  createMenuBarController();
  registerGlobalHotkey();
  startTextClipboardCapture();
  showDesktopShell();

  app.on("activate", () => {
    showDesktopShell();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  globalShortcut.unregisterAll();
  menuBarTray?.destroy();
  menuBarTray = null;
  stopTextClipboardCapture();
  closeClipboardHistory();
});
