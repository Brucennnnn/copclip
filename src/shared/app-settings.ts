export type CopClipTheme = "system" | "light" | "dark";

export type PopupSize = {
  width: number;
  height: number;
};

export type CopClipSettings = {
  globalHotkey: string;
  historyLimit: number;
  popupSize: PopupSize;
  theme: CopClipTheme;
};

export type CopClipSettingsPatch = Partial<{
  globalHotkey: unknown;
  historyLimit: unknown;
  popupSize: Partial<Record<keyof PopupSize, unknown>>;
  theme: unknown;
}>;

export type SettingsValidationResult = {
  settings: CopClipSettings;
  errors: Partial<Record<keyof CopClipSettings | "popupSize.width" | "popupSize.height", string>>;
};

export const defaultCopClipSettings: CopClipSettings = {
  globalHotkey: "CommandOrControl+Shift+V",
  historyLimit: 100,
  popupSize: {
    width: 400,
    height: 500
  },
  theme: "system"
};

const minHistoryLimit = 1;
const maxHistoryLimit = 5000;
const minPopupWidth = 320;
const maxPopupWidth = 900;
const minPopupHeight = 360;
const maxPopupHeight = 900;
const validThemes: CopClipTheme[] = ["system", "light", "dark"];

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

function readInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value);
  }

  return undefined;
}

export function validateSettings(
  patch: CopClipSettingsPatch,
  currentSettings: CopClipSettings = defaultCopClipSettings
): SettingsValidationResult {
  const settings: CopClipSettings = {
    ...currentSettings,
    popupSize: {
      ...currentSettings.popupSize
    }
  };
  const errors: SettingsValidationResult["errors"] = {};

  if ("globalHotkey" in patch) {
    const hotkey = typeof patch.globalHotkey === "string" ? patch.globalHotkey.trim() : "";

    if (!isValidHotkey(hotkey)) {
      errors.globalHotkey = "Use a shortcut like CommandOrControl+Shift+V.";
    } else {
      settings.globalHotkey = hotkey;
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
