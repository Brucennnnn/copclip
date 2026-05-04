import { contextBridge, ipcRenderer } from "electron";
import { appInfo } from "../shared/app-info";
import type { CopClipSettings } from "../shared/app-settings";
import type { ClipboardItem } from "../shared/clipboard-history";
import type { CopClipApi } from "./api";

const copclip: CopClipApi = {
  getAppInfo: () => appInfo,
  dismissClipboardPopup: () => ipcRenderer.invoke("clipboard-popup:dismiss"),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  listClipboardHistory: (query) => ipcRenderer.invoke("clipboard-history:list", query),
  onClipboardHistoryChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, items: ClipboardItem[]) => {
      callback(items);
    };

    ipcRenderer.on("clipboard-history:changed", listener);
    return () => {
      ipcRenderer.removeListener("clipboard-history:changed", listener);
    };
  },
  onSettingsChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: CopClipSettings) => {
      callback(settings);
    };

    ipcRenderer.on("settings:changed", listener);
    return () => {
      ipcRenderer.removeListener("settings:changed", listener);
    };
  },
  onClipboardPopupOpened: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, items: ClipboardItem[]) => {
      callback(items);
    };

    ipcRenderer.on("clipboard-popup:opened", listener);
    return () => {
      ipcRenderer.removeListener("clipboard-popup:opened", listener);
    };
  },
  openSettings: () => ipcRenderer.invoke("settings:open"),
  restoreClipboardItem: (id) => ipcRenderer.invoke("clipboard-history:restore", id),
  updateSettings: (patch) => ipcRenderer.invoke("settings:update", patch)
};

contextBridge.exposeInMainWorld("copclip", copclip);
