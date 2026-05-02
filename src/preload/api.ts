import type { AppInfo } from "../shared/app-info";
import type { CopClipSettings, CopClipSettingsPatch } from "../shared/app-settings";
import type { ClipboardTextItem } from "../shared/clipboard-history";

export type SettingsUpdateResult = {
  ok: boolean;
  settings: CopClipSettings;
  errors: Partial<Record<keyof CopClipSettings | "popupSize.width" | "popupSize.height", string>>;
};

export type CopClipApi = {
  getAppInfo: () => AppInfo;
  dismissClipboardPopup: () => Promise<void>;
  getSettings: () => Promise<CopClipSettings>;
  listClipboardHistory: (query?: string) => Promise<ClipboardTextItem[]>;
  onClipboardHistoryChanged: (callback: (items: ClipboardTextItem[]) => void) => () => void;
  onClipboardPopupOpened: (callback: (items: ClipboardTextItem[]) => void) => () => void;
  onSettingsChanged: (callback: (settings: CopClipSettings) => void) => () => void;
  restoreClipboardItem: (id: string) => Promise<boolean>;
  updateSettings: (patch: CopClipSettingsPatch) => Promise<SettingsUpdateResult>;
};

export const exposedApiKeys = [
  "getAppInfo",
  "dismissClipboardPopup",
  "getSettings",
  "listClipboardHistory",
  "onClipboardHistoryChanged",
  "onClipboardPopupOpened",
  "onSettingsChanged",
  "restoreClipboardItem",
  "updateSettings"
] as const;
