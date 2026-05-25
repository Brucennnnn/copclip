export type CopClipTheme = "system" | "light" | "dark";
export type PopupPositionMode = "cursor" | "bottom" | "top" | "center" | "last-position";

export type PopupSize = {
  width: number;
  height: number;
};

export type CopClipPinboard = {
  id: string;
  name: string;
};

export type CopClipSettings = {
  activePinboardId: string;
  checkForUpdatesAutomatically: boolean;
  capturePaused: boolean;
  historyLimit: number;
  ignoredAppBundleIds: string[];
  ignoredWindowsAppIdentifiers: string[];
  launchAtLogin: boolean;
  openClipboardHistoryShortcut: string;
  pasteAutomatically: boolean;
  pasteWithFormattingShortcut: string;
  pinboards: CopClipPinboard[];
  popupPosition: PopupPositionMode;
  popupSize: PopupSize;
  showNextPinboardShortcut: string;
  showPreviousPinboardShortcut: string;
  theme: CopClipTheme;
};

export type CopClipSettingsPatch = Partial<{
  activePinboardId: unknown;
  checkForUpdatesAutomatically: unknown;
  capturePaused: unknown;
  globalHotkey: unknown;
  historyLimit: unknown;
  ignoredAppBundleIds: unknown;
  ignoredWindowsAppIdentifiers: unknown;
  launchAtLogin: unknown;
  openClipboardHistoryShortcut: unknown;
  pasteAutomatically: unknown;
  pasteWithFormattingShortcut: unknown;
  pinboards: unknown;
  popupPosition: unknown;
  popupSize: Partial<Record<keyof PopupSize, unknown>>;
  showNextPinboardShortcut: unknown;
  showPreviousPinboardShortcut: unknown;
  theme: unknown;
}>;

export type SettingsValidationResult = {
  settings: CopClipSettings;
  errors: Partial<Record<keyof CopClipSettings | "popupSize.width" | "popupSize.height", string>>;
};

export const defaultPinboard: CopClipPinboard = {
  id: "default",
  name: "Default"
};

export const defaultCopClipSettings: CopClipSettings = {
  activePinboardId: defaultPinboard.id,
  checkForUpdatesAutomatically: true,
  capturePaused: false,
  historyLimit: 100,
  ignoredAppBundleIds: [],
  ignoredWindowsAppIdentifiers: [],
  launchAtLogin: false,
  openClipboardHistoryShortcut: "CommandOrControl+Shift+V",
  pasteAutomatically: true,
  pasteWithFormattingShortcut: "CommandOrControl+Shift+Return",
  pinboards: [defaultPinboard],
  popupPosition: "cursor",
  popupSize: {
    width: 400,
    height: 500
  },
  showNextPinboardShortcut: "CommandOrControl+Right",
  showPreviousPinboardShortcut: "CommandOrControl+Left",
  theme: "system"
};

const minHistoryLimit = 1;
const maxHistoryLimit = 5000;
const minPopupWidth = 320;
const maxPopupWidth = 900;
const minPopupHeight = 360;
const maxPopupHeight = 900;
const maxPinboards = 24;
const maxPinboardNameLength = 40;
const validThemes: CopClipTheme[] = ["system", "light", "dark"];
const validPopupPositions: PopupPositionMode[] = ["cursor", "bottom", "top", "center", "last-position"];
const pinboardIdPattern = /^[A-Za-z0-9_-]{1,64}$/;
const bundleIdPattern = /^[A-Za-z0-9][A-Za-z0-9-]*(\.[A-Za-z0-9][A-Za-z0-9-]*)+$/;
const windowsAppIdentifierPattern = /^[^\0-\u001f<>|?*"]+$/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidHotkey(value: string): boolean {
  const parts = value.split("+").map((part) => part.trim()).filter(Boolean);
  const hasModifier = parts.some((part) =>
    ["CommandOrControl", "Command", "Cmd", "Control", "Ctrl", "Alt", "Option", "Shift", "Super", "Meta"].includes(part)
  );

  return parts.length >= 2 && hasModifier && /^[A-Za-z0-9+]+$/.test(value);
}

function isValidOptionalHotkey(value: string): boolean {
  return value === "" || isValidHotkey(value);
}

function readInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value);
  }

  return undefined;
}

function normalizeIgnoredAppBundleIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const bundleIds: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return undefined;
    }

    const bundleId = item.trim();

    if (!bundleId || !bundleIdPattern.test(bundleId)) {
      return undefined;
    }

    const key = bundleId.toLocaleLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    bundleIds.push(bundleId);
  }

  return bundleIds;
}

function normalizeIgnoredWindowsAppIdentifiers(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const identifiers: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      return undefined;
    }

    const identifier = item.trim();

    if (!identifier || !windowsAppIdentifierPattern.test(identifier)) {
      return undefined;
    }

    const key = identifier.replace(/\\/g, "/").toLocaleLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    identifiers.push(identifier);
  }

  return identifiers;
}

function normalizePinboards(value: unknown): CopClipPinboard[] | undefined {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxPinboards) {
    return undefined;
  }

  const seenIds = new Set<string>();
  const pinboards: CopClipPinboard[] = [];

  for (const item of value) {
    if (!isPlainObject(item) || typeof item.id !== "string" || typeof item.name !== "string") {
      return undefined;
    }

    const id = item.id.trim();
    const name = item.name.trim();

    if (!pinboardIdPattern.test(id) || !name || name.length > maxPinboardNameLength || seenIds.has(id)) {
      return undefined;
    }

    seenIds.add(id);
    pinboards.push({ id, name });
  }

  return pinboards;
}

export function validateSettings(
  patch: CopClipSettingsPatch,
  currentSettings: CopClipSettings = defaultCopClipSettings
): SettingsValidationResult {
  const settings: CopClipSettings = {
    ...currentSettings,
    pinboards: currentSettings.pinboards.map((pinboard) => ({ ...pinboard })),
    popupSize: {
      ...currentSettings.popupSize
    }
  };
  const errors: SettingsValidationResult["errors"] = {};

  if ("checkForUpdatesAutomatically" in patch) {
    if (typeof patch.checkForUpdatesAutomatically === "boolean") {
      settings.checkForUpdatesAutomatically = patch.checkForUpdatesAutomatically;
    } else {
      errors.checkForUpdatesAutomatically = "Use on or off.";
    }
  }

  if ("capturePaused" in patch) {
    if (typeof patch.capturePaused === "boolean") {
      settings.capturePaused = patch.capturePaused;
    } else {
      errors.capturePaused = "Use on or off.";
    }
  }

  if ("globalHotkey" in patch && !("openClipboardHistoryShortcut" in patch)) {
    const hotkey = typeof patch.globalHotkey === "string" ? patch.globalHotkey.trim() : "";

    if (!isValidHotkey(hotkey)) {
      errors.openClipboardHistoryShortcut = "Use a shortcut like CommandOrControl+Shift+V.";
    } else {
      settings.openClipboardHistoryShortcut = hotkey;
    }
  }

  if ("openClipboardHistoryShortcut" in patch) {
    const shortcut = typeof patch.openClipboardHistoryShortcut === "string" ? patch.openClipboardHistoryShortcut.trim() : "";

    if (!isValidOptionalHotkey(shortcut)) {
      errors.openClipboardHistoryShortcut = "Use a shortcut like CommandOrControl+Shift+V.";
    } else {
      settings.openClipboardHistoryShortcut = shortcut;
    }
  }

  if ("launchAtLogin" in patch) {
    if (typeof patch.launchAtLogin === "boolean") {
      settings.launchAtLogin = patch.launchAtLogin;
    } else {
      errors.launchAtLogin = "Use on or off.";
    }
  }

  if ("pasteAutomatically" in patch) {
    if (typeof patch.pasteAutomatically === "boolean") {
      settings.pasteAutomatically = patch.pasteAutomatically;
    } else {
      errors.pasteAutomatically = "Use on or off.";
    }
  }

  if ("pasteWithFormattingShortcut" in patch) {
    const shortcut = typeof patch.pasteWithFormattingShortcut === "string" ? patch.pasteWithFormattingShortcut.trim() : "";

    if (!isValidOptionalHotkey(shortcut)) {
      errors.pasteWithFormattingShortcut = "Use a shortcut like CommandOrControl+Shift+Return.";
    } else {
      settings.pasteWithFormattingShortcut = shortcut;
    }
  }

  if ("showNextPinboardShortcut" in patch) {
    const shortcut = typeof patch.showNextPinboardShortcut === "string" ? patch.showNextPinboardShortcut.trim() : "";

    if (!isValidOptionalHotkey(shortcut)) {
      errors.showNextPinboardShortcut = "Use a shortcut like CommandOrControl+Right.";
    } else {
      settings.showNextPinboardShortcut = shortcut;
    }
  }

  if ("showPreviousPinboardShortcut" in patch) {
    const shortcut = typeof patch.showPreviousPinboardShortcut === "string" ? patch.showPreviousPinboardShortcut.trim() : "";

    if (!isValidOptionalHotkey(shortcut)) {
      errors.showPreviousPinboardShortcut = "Use a shortcut like CommandOrControl+Left.";
    } else {
      settings.showPreviousPinboardShortcut = shortcut;
    }
  }

  if ("pinboards" in patch) {
    const pinboards = normalizePinboards(patch.pinboards);

    if (!pinboards) {
      errors.pinboards = `Use 1 to ${maxPinboards} pinboards with names up to ${maxPinboardNameLength} characters.`;
    } else {
      settings.pinboards = pinboards;
    }
  }

  if ("activePinboardId" in patch) {
    const activePinboardId = typeof patch.activePinboardId === "string" ? patch.activePinboardId.trim() : "";

    if (!settings.pinboards.some((pinboard) => pinboard.id === activePinboardId)) {
      errors.activePinboardId = "Choose an existing pinboard.";
    } else {
      settings.activePinboardId = activePinboardId;
    }
  }

  if (!settings.pinboards.some((pinboard) => pinboard.id === settings.activePinboardId)) {
    settings.activePinboardId = settings.pinboards[0]?.id ?? defaultPinboard.id;
  }

  if ("popupPosition" in patch) {
    if (typeof patch.popupPosition === "string" && validPopupPositions.includes(patch.popupPosition as PopupPositionMode)) {
      settings.popupPosition = patch.popupPosition as PopupPositionMode;
    } else {
      errors.popupPosition = "Choose cursor, bottom, top, center, or last position.";
    }
  }

  if ("historyLimit" in patch) {
    const historyLimit = readInteger(patch.historyLimit);

    if (!historyLimit || historyLimit < minHistoryLimit || historyLimit > maxHistoryLimit) {
      errors.historyLimit = `Use a number from ${minHistoryLimit} to ${maxHistoryLimit}.`;
    } else {
      settings.historyLimit = historyLimit;
    }
  }

  if ("ignoredAppBundleIds" in patch) {
    const ignoredAppBundleIds = normalizeIgnoredAppBundleIds(patch.ignoredAppBundleIds);

    if (!ignoredAppBundleIds) {
      errors.ignoredAppBundleIds = "Use valid app bundle IDs.";
    } else {
      settings.ignoredAppBundleIds = ignoredAppBundleIds;
    }
  }

  if ("ignoredWindowsAppIdentifiers" in patch) {
    const ignoredWindowsAppIdentifiers = normalizeIgnoredWindowsAppIdentifiers(patch.ignoredWindowsAppIdentifiers);

    if (!ignoredWindowsAppIdentifiers) {
      errors.ignoredWindowsAppIdentifiers = "Use executable names or paths.";
    } else {
      settings.ignoredWindowsAppIdentifiers = ignoredWindowsAppIdentifiers;
    }
  }

  if ("popupSize" in patch) {
    const popupSize = patch.popupSize;

    if (!isPlainObject(popupSize)) {
      errors.popupSize = "Use width and height values.";
    } else {
      if ("width" in popupSize) {
        const width = readInteger(popupSize.width);

        if (!width || width < minPopupWidth || width > maxPopupWidth) {
          errors["popupSize.width"] = `Use a width from ${minPopupWidth} to ${maxPopupWidth}.`;
        } else {
          settings.popupSize.width = width;
        }
      }

      if ("height" in popupSize) {
        const height = readInteger(popupSize.height);

        if (!height || height < minPopupHeight || height > maxPopupHeight) {
          errors["popupSize.height"] = `Use a height from ${minPopupHeight} to ${maxPopupHeight}.`;
        } else {
          settings.popupSize.height = height;
        }
      }
    }
  }

  if ("theme" in patch) {
    if (typeof patch.theme === "string" && validThemes.includes(patch.theme as CopClipTheme)) {
      settings.theme = patch.theme as CopClipTheme;
    } else {
      errors.theme = "Choose System, Light, or Dark.";
    }
  }

  return {
    settings,
    errors
  };
}

export function hasSettingsValidationErrors(result: SettingsValidationResult): boolean {
  return Object.keys(result.errors).length > 0;
}
