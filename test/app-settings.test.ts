import { mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createFileSettingsStore } from "../src/main/settings-store";
import { defaultCopClipSettings, validateSettings } from "../src/shared/app-settings";

describe("CopClip settings validation", () => {
  it("accepts valid core settings", () => {
    const result = validateSettings({
      openClipboardHistoryShortcut: "CommandOrControl+Alt+V",
      checkForUpdatesAutomatically: false,
      capturePaused: true,
      historyLimit: "250",
      ignoredAppBundleIds: [" com.example.Passwords ", "com.example.passwords", "com.example.Vault"],
      ignoredWindowsAppIdentifiers: [" PasswordManager.exe ", "passwordmanager.exe", "C:\\Tools\\Vault.exe"],
      launchAtLogin: true,
      pasteAutomatically: false,
      pasteWithFormattingShortcut: "CommandOrControl+Shift+Return",
      popupPosition: "center",
      popupSize: {
        width: "520",
        height: 640
      },
      theme: "dark"
    });

    expect(result.errors).toEqual({});
    expect(result.settings).toEqual({
      checkForUpdatesAutomatically: false,
      capturePaused: true,
      historyLimit: 250,
      ignoredAppBundleIds: ["com.example.Passwords", "com.example.Vault"],
      ignoredWindowsAppIdentifiers: ["PasswordManager.exe", "C:\\Tools\\Vault.exe"],
      launchAtLogin: true,
      openClipboardHistoryShortcut: "CommandOrControl+Alt+V",
      pasteAutomatically: false,
      pasteWithFormattingShortcut: "CommandOrControl+Shift+Return",
      popupPosition: "center",
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
        openClipboardHistoryShortcut: "V",
        checkForUpdatesAutomatically: "yes",
        capturePaused: "yes",
        historyLimit: 0,
        ignoredAppBundleIds: ["not-a-bundle-id"],
        ignoredWindowsAppIdentifiers: ["bad*app.exe"],
        launchAtLogin: "yes",
        pasteAutomatically: "yes",
        pasteWithFormattingShortcut: "V",
        popupPosition: "corner",
        popupSize: {
          width: 100,
          height: 1200
        },
        theme: "purple"
      },
      defaultCopClipSettings
    );

    expect(result.errors).toEqual({
      checkForUpdatesAutomatically: "Use on or off.",
      capturePaused: "Use on or off.",
      historyLimit: "Use a number from 1 to 5000.",
      ignoredAppBundleIds: "Use valid app bundle IDs.",
      ignoredWindowsAppIdentifiers: "Use executable names or paths.",
      launchAtLogin: "Use on or off.",
      openClipboardHistoryShortcut: "Use a shortcut like CommandOrControl+Shift+V.",
      pasteAutomatically: "Use on or off.",
      pasteWithFormattingShortcut: "Use a shortcut like CommandOrControl+Shift+Return.",
      popupPosition: "Choose cursor, bottom, top, center, or last position.",
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
      checkForUpdatesAutomatically: true,
      capturePaused: false,
      historyLimit: 25,
      ignoredAppBundleIds: [],
      ignoredWindowsAppIdentifiers: [],
      launchAtLogin: false,
      openClipboardHistoryShortcut: "CommandOrControl+Shift+V",
      pasteAutomatically: true,
      pasteWithFormattingShortcut: "CommandOrControl+Shift+Return",
      popupPosition: "cursor",
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
