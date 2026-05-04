import { contextBridge, ipcRenderer } from "electron";
import { appInfo } from "../shared/app-info";
import type { CopClipSettings } from "../shared/app-settings";
import type { ClipboardItem } from "../shared/clipboard-history";
import { ipcChannels } from "../shared/ipc-channels";
import type { CopClipApi } from "./api";

const copclip: CopClipApi = {
  getAppInfo: () => appInfo,
  dismissClipboardPopup: () => ipcRenderer.invoke(ipcChannels.clipboardPopupDismiss),
  getSettings: () => ipcRenderer.invoke(ipcChannels.settingsGet),
  listClipboardHistory: (query) => ipcRenderer.invoke(ipcChannels.clipboardHistoryList, query),
  onClipboardHistoryChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, items: ClipboardItem[]) => {
      callback(items);
    };

    ipcRenderer.on(ipcChannels.clipboardHistoryChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.clipboardHistoryChanged, listener);
    };
  },
  onSettingsChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: CopClipSettings) => {
      callback(settings);
    };

    ipcRenderer.on(ipcChannels.settingsChanged, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.settingsChanged, listener);
    };
  },
  onClipboardPopupOpened: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, items: ClipboardItem[]) => {
      callback(items);
    };

    ipcRenderer.on(ipcChannels.clipboardPopupOpened, listener);
    return () => {
      ipcRenderer.removeListener(ipcChannels.clipboardPopupOpened, listener);
    };
  },
  restoreClipboardItem: (id) => ipcRenderer.invoke(ipcChannels.clipboardHistoryRestore, id),
  updateSettings: (patch) => ipcRenderer.invoke(ipcChannels.settingsUpdate, patch)
};

contextBridge.exposeInMainWorld("copclip", copclip);
