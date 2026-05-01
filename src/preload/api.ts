import type { AppInfo } from "../shared/app-info";
import type { ClipboardTextItem } from "../shared/clipboard-history";

export type CopClipApi = {
  getAppInfo: () => AppInfo;
  listClipboardHistory: (query?: string) => Promise<ClipboardTextItem[]>;
  onClipboardHistoryChanged: (callback: (items: ClipboardTextItem[]) => void) => () => void;
};

export const exposedApiKeys = [
  "getAppInfo",
  "listClipboardHistory",
  "onClipboardHistoryChanged"
] as const;
