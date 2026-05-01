import type { AppInfo } from "../shared/app-info";

export type CopClipApi = {
  getAppInfo: () => AppInfo;
};

export const exposedApiKeys = ["getAppInfo"] as const;
