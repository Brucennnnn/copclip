import { contextBridge, ipcRenderer } from "electron";
import { appInfo } from "../shared/app-info";
import type { ClipboardTextItem } from "../shared/clipboard-history";
import type { CopClipApi } from "./api";

const copclip: CopClipApi = {
  getAppInfo: () => appInfo,
  dismissClipboardPopup: () => ipcRenderer.invoke("clipboard-popup:dismiss"),
  listClipboardHistory: (query) => ipcRenderer.invoke("clipboard-history:list", query),
  onClipboardHistoryChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, items: ClipboardTextItem[]) => {
      callback(items);
    };

    ipcRenderer.on("clipboard-history:changed", listener);
    return () => {
      ipcRenderer.removeListener("clipboard-history:changed", listener);
    };
  },
  restoreClipboardItem: (id) => ipcRenderer.invoke("clipboard-history:restore", id)
};

contextBridge.exposeInMainWorld("copclip", copclip);
