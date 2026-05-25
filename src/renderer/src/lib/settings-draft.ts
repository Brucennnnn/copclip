import type { SettingsUpdateResult } from "../../../preload/api";
import type { CopClipPinboard, CopClipSettings } from "../../../shared/app-settings";

export type SettingsErrors = SettingsUpdateResult["errors"];
export type SettingsPage = "history" | "general" | "privacy" | "shortcuts" | "subscription";

export type SettingsDraft = {
  activePinboardId: string;
  capturePaused: boolean;
  checkForUpdatesAutomatically: boolean;
  historyLimit: string;
  ignoredAppBundleIds: string[];
  ignoredWindowsAppIdentifiers: string[];
  launchAtLogin: boolean;
  openClipboardHistoryShortcut: string;
  pasteAutomatically: boolean;
  pasteWithFormattingShortcut: string;
  pinboards: CopClipPinboard[];
  popupPosition: CopClipSettings["popupPosition"];
  popupSize: {
    width: string;
    height: string;
  };
  showNextPinboardShortcut: string;
  showPreviousPinboardShortcut: string;
  theme: CopClipSettings["theme"];
};

export function createSettingsDraft(settings: CopClipSettings): SettingsDraft {
  return {
    activePinboardId: settings.activePinboardId,
    capturePaused: settings.capturePaused,
    checkForUpdatesAutomatically: settings.checkForUpdatesAutomatically,
    historyLimit: String(settings.historyLimit),
    ignoredAppBundleIds: settings.ignoredAppBundleIds,
    ignoredWindowsAppIdentifiers: settings.ignoredWindowsAppIdentifiers,
    launchAtLogin: settings.launchAtLogin,
    openClipboardHistoryShortcut: settings.openClipboardHistoryShortcut,
    pasteAutomatically: settings.pasteAutomatically,
    pasteWithFormattingShortcut: settings.pasteWithFormattingShortcut,
    pinboards: settings.pinboards.map((pinboard) => ({ ...pinboard })),
    popupPosition: settings.popupPosition,
    popupSize: {
      width: String(settings.popupSize.width),
      height: String(settings.popupSize.height)
    },
    showNextPinboardShortcut: settings.showNextPinboardShortcut,
    showPreviousPinboardShortcut: settings.showPreviousPinboardShortcut,
    theme: settings.theme
  };
}

export function normalizeSettingsPage(hash: string): SettingsPage {
  const page = hash.replace("#", "");

  if (page === "general" || page === "privacy" || page === "shortcuts" || page === "subscription") {
    return page;
  }

  if (page === "settings") {
    return "general";
  }

  return "history";
}

export function settingStatusText(status: string, errors: SettingsErrors): string {
  if (status) {
    return status;
  }

  return Object.keys(errors).length > 0 ? "Check values" : "Local";
}
