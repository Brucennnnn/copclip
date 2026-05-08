import { describe, expect, it } from "vitest";
import { ignoredAppBundleIdsForDisplay, shouldIgnoreFrontmostApp } from "../src/shared/ignored-app-policy";

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

  it("deduplicates default and configured bundle IDs for display", () => {
    expect(ignoredAppBundleIdsForDisplay(["com.apple.keychainaccess", "com.example.vault"])).toContain("com.example.vault");
    expect(ignoredAppBundleIdsForDisplay(["com.apple.keychainaccess"]).filter((bundleId) => bundleId === "com.apple.keychainaccess")).toHaveLength(1);
  });
});
