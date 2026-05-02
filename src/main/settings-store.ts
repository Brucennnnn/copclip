import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  defaultCopClipSettings,
  hasSettingsValidationErrors,
  validateSettings,
  type CopClipSettings,
  type CopClipSettingsPatch,
  type SettingsValidationResult
} from "../shared/app-settings";

export type SettingsStore = {
  get: () => CopClipSettings;
  update: (patch: CopClipSettingsPatch) => SettingsValidationResult;
};

export function createFileSettingsStore(settingsPath: string): SettingsStore {
  let settings = loadSettings(settingsPath);

  function persist(): void {
    mkdirSync(dirname(settingsPath), { recursive: true });
    writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  }

  return {
    get: () => settings,
    update: (patch) => {
      const result = validateSettings(patch, settings);

      if (!hasSettingsValidationErrors(result)) {
        settings = result.settings;
        persist();
      }

      return {
        ...result,
        settings
      };
    }
  };
}

function loadSettings(settingsPath: string): CopClipSettings {
  try {
    const parsed = JSON.parse(readFileSync(settingsPath, "utf8")) as unknown;
    const result = validateSettings(parsed as CopClipSettingsPatch, defaultCopClipSettings);
    return result.settings;
  } catch {
    return defaultCopClipSettings;
  }
}
