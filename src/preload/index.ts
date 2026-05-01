import { contextBridge } from "electron";
import { appInfo } from "../shared/app-info";
import type { CopClipApi } from "./api";

const copclip: CopClipApi = {
  getAppInfo: () => appInfo
};

contextBridge.exposeInMainWorld("copclip", copclip);
