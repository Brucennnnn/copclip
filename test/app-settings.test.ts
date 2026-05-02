import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createFileSettingsStore } from "../src/main/settings-store";
import { defaultCopClipSettings, validateSettings } from "../src/shared/app-settings";

describe("CopClip settings validation", () => {
  it("accepts valid core settings", () => {
    const result = validateSettings({
      globalHotkey: "CommandOrControl+Alt+V",
      historyLimit: "250",
      popupSize: {
        width: "520",
        height: 640
      },
      theme: "dark"
    });

    expect(result.errors).toEqual({});
    expect(result.settings).toEqual({
      globalHotkey: "CommandOrControl+Alt+V",
      historyLimit: 250,
      popupSize: {
        width: 520,
        height: 640
      },
      theme: "dark"
    });
  });

  it("rejects invalid values and keeps the current settings", () => {
    const result = validateSettings(
      {
        globalHotkey: "V",
        historyLimit: 0,
        popupSize: {
          width: 100,
          height: 1200
        },
        theme: "purple"
      },
      defaultCopClipSettings
    );

    expect(result.errors).toEqual({
      globalHotkey: "Use a shortcut like CommandOrControl+Shift+V.",
      historyLimit: "Use a number from 1 to 5000.",
      "popupSize.width": "Use a width from 320 to 900.",
      "popupSize.height": "Use a height from 360 to 900.",
      theme: "Choose System, Light, or Dark."
    });
    expect(result.settings).toEqual(defaultCopClipSettings);
  });
});

describe("file settings store", () => {
  it("persists valid settings locally", () => {
    const settingsPath = join(mkdtempSync(join(tmpdir(), "copclip-settings-")), "settings.json");
    const store = createFileSettingsStore(settingsPath);

    const result = store.update({
      historyLimit: 25,
      popupSize: {
        width: 480,
        height: 620
      },
      theme: "light"
    });

    expect(result.errors).toEqual({});
    expect(JSON.parse(readFileSync(settingsPath, "utf8"))).toEqual({
      globalHotkey: "CommandOrControl+Shift+V",
      historyLimit: 25,
      popupSize: {
        width: 480,
        height: 620
      },
      theme: "light"
    });
  });

  it("does not persist invalid settings", () => {
    const settingsPath = join(mkdtempSync(join(tmpdir(), "copclip-settings-")), "settings.json");
    const store = createFileSettingsStore(settingsPath);

    const result = store.update({
      historyLimit: -1
    });

    expect(result.errors.historyLimit).toBe("Use a number from 1 to 5000.");
    expect(store.get()).toEqual(defaultCopClipSettings);
  });
});
