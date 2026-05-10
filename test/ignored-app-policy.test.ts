import { describe, expect, it } from "vitest";
import {
  ignoredAppBundleIdsForDisplay,
  ignoredWindowsAppIdentifiersForDisplay,
  shouldIgnoreActiveApp,
  shouldIgnoreFrontmostApp
} from "../src/shared/ignored-app-policy";

describe("ignored app policy", () => {
  it("skips default sensitive apps", () => {
    expect(shouldIgnoreFrontmostApp("com.apple.keychainaccess", { ignoredAppBundleIds: [] })).toBe(true);
  });

  it("skips configured apps case-insensitively", () => {
    expect(shouldIgnoreFrontmostApp("COM.EXAMPLE.VAULT", { ignoredAppBundleIds: ["com.example.vault"] })).toBe(true);
  });

  it("continues capture when frontmost detection is unavailable", () => {
    expect(shouldIgnoreFrontmostApp(null, { ignoredAppBundleIds: ["com.example.vault"] })).toBe(false);
  });

  it("skips configured Windows apps by executable name", () => {
    expect(
      shouldIgnoreActiveApp(
        { platform: "win32", executableName: "PASSWORDMANAGER.EXE", executablePath: "C:\\Program Files\\PasswordManager\\PasswordManager.exe" },
        { ignoredAppBundleIds: [], ignoredWindowsAppIdentifiers: ["passwordmanager.exe"] }
      )
    ).toBe(true);
  });

  it("skips configured Windows apps by executable path", () => {
    expect(
      shouldIgnoreActiveApp(
        { platform: "win32", executableName: "PasswordManager.exe", executablePath: "C:\\Program Files\\PasswordManager\\PasswordManager.exe" },
        { ignoredAppBundleIds: [], ignoredWindowsAppIdentifiers: ["c:/program files/passwordmanager/passwordmanager.exe"] }
      )
    ).toBe(true);
  });

  it("continues capture for non-matching Windows apps", () => {
    expect(
      shouldIgnoreActiveApp(
        { platform: "win32", executableName: "Editor.exe", executablePath: "C:\\Tools\\Editor.exe" },
        { ignoredAppBundleIds: [], ignoredWindowsAppIdentifiers: ["PasswordManager.exe"] }
      )
    ).toBe(false);
  });

  it("deduplicates default and configured bundle IDs for display", () => {
    expect(ignoredAppBundleIdsForDisplay(["com.apple.keychainaccess", "com.example.vault"])).toContain("com.example.vault");
    expect(ignoredAppBundleIdsForDisplay(["com.apple.keychainaccess"]).filter((bundleId) => bundleId === "com.apple.keychainaccess")).toHaveLength(1);
  });

  it("deduplicates default and configured Windows identifiers for display", () => {
    expect(ignoredWindowsAppIdentifiersForDisplay(["bitwarden.exe", "PasswordManager.exe"])).toContain("PasswordManager.exe");
    expect(ignoredWindowsAppIdentifiersForDisplay(["bitwarden.exe"]).filter((identifier) => identifier === "Bitwarden.exe")).toHaveLength(1);
  });
});
