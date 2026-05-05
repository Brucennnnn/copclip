import type { SettingsUpdateResult } from "../../../preload/api";
import type { CopClipSettings } from "../../../shared/app-settings";

export type SettingsErrors = SettingsUpdateResult["errors"];
export type SettingsPage = "history" | "general" | "privacy" | "shortcuts" | "subscription";

export type SettingsDraft = {
  checkForUpdatesAutomatically: boolean;
  historyLimit: string;
  launchAtLogin: boolean;
  openClipboardHistoryShortcut: string;
  pasteAutomatically: boolean;
  pasteWithFormattingShortcut: string;
  popupPosition: CopClipSettings["popupPosition"];
  popupSize: {
    width: string;
    height: string;
  };
  theme: CopClipSettings["theme"];
};

export function createSettingsDraft(settings: CopClipSettings): SettingsDraft {
  return {
    checkForUpdatesAutomatically: settings.checkForUpdatesAutomatically,
    historyLimit: String(settings.historyLimit),
    launchAtLogin: settings.launchAtLogin,
    openClipboardHistoryShortcut: settings.openClipboardHistoryShortcut,
    pasteAutomatically: settings.pasteAutomatically,
    pasteWithFormattingShortcut: settings.pasteWithFormattingShortcut,
    popupPosition: settings.popupPosition,
    popupSize: {
      width: String(settings.popupSize.width),
      height: String(settings.popupSize.height)
    },
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
