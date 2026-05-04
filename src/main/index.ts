import { join } from "node:path";
import { app, BrowserWindow, globalShortcut, ipcMain, Menu, nativeImage, screen, shell, Tray } from "electron";
import { is } from "@electron-toolkit/utils";
import {
  captureCurrentClipboardItem,
  closeClipboardHistory,
  configureClipboardHistory,
  clearClipboardHistory,
  registerClipboardHistoryIpc,
  sendToLiveWindow,
  startClipboardCapture,
  stopClipboardCapture,
  updateClipboardHistoryLimit
} from "./clipboard-capture";
import { debugLog } from "./debug-log";
import { capturePasteTargetApplication } from "./auto-paste";
import { buildMenuBarTemplate } from "./menu-bar";
import { ensureLiveWindow } from "./popup-window-state";
import { createFileSettingsStore, type SettingsStore } from "./settings-store";
import { createSqliteClipboardHistory } from "./sqlite-clipboard-history";
import { defaultCopClipSettings, hasSettingsValidationErrors, validateSettings, type CopClipSettings } from "../shared/app-settings";
import { preloadScriptPath, rendererDevUrl, type RendererSurface } from "./window-paths";
import { positionPopupNearCursor } from "../shared/popup-position";

const desktopSize = {
  width: 1040,
  height: 720
};

let desktopWindow: BrowserWindow | null = null;
let popupWindow: BrowserWindow | null = null;
let menuBarTray: Tray | null = null;
let capturePaused = false;
let dockHidden = false;
let registeredHotkey = "";
let settingsStore: SettingsStore | null = null;
let appSettings: CopClipSettings = defaultCopClipSettings;
let suppressDesktopShellUntil = 0;

function suppressDesktopShellActivation(durationMs = 1000): void {
  suppressDesktopShellUntil = Math.max(suppressDesktopShellUntil, Date.now() + durationMs);
}

function shouldShowDesktopShellOnActivate(): boolean {
  const popupIsVisible = popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible();
  return !popupIsVisible && Date.now() >= suppressDesktopShellUntil;
}

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
  capturePasteTargetApplication();
  popupWindow = ensureLiveWindow(popupWindow, createClipboardPopupWindow);

  suppressDesktopShellActivation();
  if (desktopWindow && !desktopWindow.isDestroyed() && desktopWindow.isVisible()) {
    desktopWindow.hide();
  }

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const position = positionPopupNearCursor(cursor, display.workArea, appSettings.popupSize);

  const items = captureCurrentClipboardItem({ force: true });
  debugLog("popup", "show popup", {
    historyCount: items.length,
    x: position.x,
    y: position.y,
    width: appSettings.popupSize.width,
    height: appSettings.popupSize.height
  });
  popupWindow.setBounds({ ...position, ...appSettings.popupSize });
  popupWindow.setAlwaysOnTop(true, "floating");
  popupWindow.show();
  popupWindow.focus();
  const sent = sendToLiveWindow(popupWindow, "clipboard-popup:opened", items);
  debugLog("popup", "sent popup opened event", { sent });
}

function registerGlobalHotkey(accelerator = appSettings.globalHotkey): boolean {
  const registered = globalShortcut.register(accelerator, openClipboardPopup);
  debugLog("hotkey", "register global shortcut", { accelerator, registered });

  if (!registered) {
    console.warn(`CopClip could not register ${accelerator} global shortcut.`);
    return false;
  }

  registeredHotkey = accelerator;
  return true;
}

function replaceGlobalHotkey(accelerator: string): boolean {
  if (accelerator === registeredHotkey) {
    return true;
  }

  const registered = globalShortcut.register(accelerator, openClipboardPopup);
  debugLog("hotkey", "replace global shortcut", { accelerator, registered });

  if (!registered) {
    return false;
  }

  if (registeredHotkey) {
    globalShortcut.unregister(registeredHotkey);
  }

  registeredHotkey = accelerator;
  return true;
}

function sendSettingsChanged(): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    sendToLiveWindow(window, "settings:changed", appSettings);
  });
}

function registerSettingsIpc(): void {
  ipcMain.handle("settings:get", () => appSettings);

  ipcMain.handle("settings:update", (_event, patch) => {
    if (!settingsStore) {
      return {
        ok: false,
        settings: appSettings,
        errors: {
          theme: "Settings storage is not ready."
        }
      };
    }

    const validation = validateSettings(patch, appSettings);

    if (hasSettingsValidationErrors(validation)) {
      return {
        ok: false,
        settings: appSettings,
        errors: validation.errors
      };
    }

    if (validation.settings.globalHotkey !== appSettings.globalHotkey && !replaceGlobalHotkey(validation.settings.globalHotkey)) {
      return {
        ok: false,
        settings: appSettings,
        errors: {
          globalHotkey: "This shortcut could not be registered."
        }
      };
    }

    const previousSettings = appSettings;
    const result = settingsStore.update(patch);
    appSettings = result.settings;

    if (appSettings.historyLimit !== previousSettings.historyLimit) {
      updateClipboardHistoryLimit(appSettings.historyLimit);
    }

    if (
      popupWindow &&
      !popupWindow.isDestroyed() &&
      (appSettings.popupSize.width !== previousSettings.popupSize.width ||
        appSettings.popupSize.height !== previousSettings.popupSize.height)
    ) {
      popupWindow.setMinimumSize(appSettings.popupSize.width, appSettings.popupSize.height);
      popupWindow.setSize(appSettings.popupSize.width, appSettings.popupSize.height);
    }

    sendSettingsChanged();
    debugLog("settings", "updated settings", appSettings);
    return {
      ok: true,
      settings: appSettings,
      errors: {}
    };
  });
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
          stopClipboardCapture();
          capturePaused = true;
        },
        quit: () => {
          app.quit();
        },
        resumeCapture: () => {
          startClipboardCapture();
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
    width: appSettings.popupSize.width,
    height: appSettings.popupSize.height,
    minWidth: appSettings.popupSize.width,
    minHeight: appSettings.popupSize.height,
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
    suppressDesktopShellActivation();
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
  settingsStore = createFileSettingsStore(join(app.getPath("userData"), "settings.json"));
  appSettings = settingsStore.get();
  configureClipboardHistory(createSqliteClipboardHistory(join(app.getPath("userData"), "clipboard-history.sqlite"), {
    historyLimit: appSettings.historyLimit
  }));
  registerClipboardHistoryIpc();
  registerSettingsIpc();
  desktopWindow = createDesktopShellWindow();
  popupWindow = createClipboardPopupWindow();
  createMenuBarController();
  registerGlobalHotkey();
  startClipboardCapture();
  showDesktopShell();

  app.on("activate", () => {
    if (shouldShowDesktopShellOnActivate()) {
      showDesktopShell();
    }
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
  stopClipboardCapture();
  closeClipboardHistory();
});
