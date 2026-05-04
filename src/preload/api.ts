import type { AppInfo } from "../shared/app-info";
import type { CopClipSettings, CopClipSettingsPatch } from "../shared/app-settings";
import type { ClipboardItem } from "../shared/clipboard-history";

export type SettingsUpdateResult = {
  ok: boolean;
  settings: CopClipSettings;
  errors: Partial<Record<keyof CopClipSettings | "popupSize.width" | "popupSize.height", string>>;
};

export type CopClipApi = {
  clearClipboardHistory: () => Promise<ClipboardItem[]>;
  deleteClipboardItem: (id: string) => Promise<ClipboardItem[]>;
  getAppInfo: () => AppInfo;
  dismissClipboardPopup: () => Promise<void>;
  getSettings: () => Promise<CopClipSettings>;
  listClipboardHistory: (query?: string) => Promise<ClipboardItem[]>;
  onClipboardHistoryChanged: (callback: (items: ClipboardItem[]) => void) => () => void;
  onClipboardPopupOpened: (callback: (items: ClipboardItem[]) => void) => () => void;
  onSettingsChanged: (callback: (settings: CopClipSettings) => void) => () => void;
  openSettings: () => Promise<void>;
  pinClipboardItem: (id: string) => Promise<ClipboardItem[]>;
  restoreClipboardItem: (id: string) => Promise<boolean>;
  unpinClipboardItem: (id: string) => Promise<ClipboardItem[]>;
  updateSettings: (patch: CopClipSettingsPatch) => Promise<SettingsUpdateResult>;
};

export const exposedApiKeys = [
  "clearClipboardHistory",
  "deleteClipboardItem",
  "getAppInfo",
  "dismissClipboardPopup",
  "getSettings",
  "listClipboardHistory",
  "onClipboardHistoryChanged",
  "onClipboardPopupOpened",
  "onSettingsChanged",
  "openSettings",
  "pinClipboardItem",
  "restoreClipboardItem",
  "unpinClipboardItem",
  "updateSettings"
] as const;
