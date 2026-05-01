import type { AppInfo } from "../shared/app-info";
import type { ClipboardTextItem } from "../shared/clipboard-history";

export type CopClipApi = {
  getAppInfo: () => AppInfo;
  dismissClipboardPopup: () => Promise<void>;
  listClipboardHistory: (query?: string) => Promise<ClipboardTextItem[]>;
  onClipboardHistoryChanged: (callback: (items: ClipboardTextItem[]) => void) => () => void;
  onClipboardPopupOpened: (callback: (items: ClipboardTextItem[]) => void) => () => void;
  restoreClipboardItem: (id: string) => Promise<boolean>;
};

export const exposedApiKeys = [
  "getAppInfo",
  "dismissClipboardPopup",
  "listClipboardHistory",
  "onClipboardHistoryChanged",
  "onClipboardPopupOpened",
  "restoreClipboardItem"
] as const;
