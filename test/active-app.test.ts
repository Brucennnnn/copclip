import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.fn();
const originalPlatform = process.platform;

function stubPlatform(platform: NodeJS.Platform): void {
  Object.defineProperty(process, "platform", {
    configurable: true,
    value: platform
  });
}

vi.mock("node:child_process", () => ({
  default: {
    execFileSync
  },
  execFileSync
}));

describe("active app detection", () => {
  beforeEach(() => {
    stubPlatform(originalPlatform);
    execFileSync.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    stubPlatform(originalPlatform);
  });

  it("returns a macOS bundle identity", async () => {
    stubPlatform("darwin");
    execFileSync.mockReturnValue("com.example.Editor\n");
    const { getActiveAppIdentity } = await import("../src/main/active-app");

    expect(getActiveAppIdentity()).toEqual({
      platform: "darwin",
      bundleId: "com.example.Editor"
    });
  });

  it("returns a Windows executable identity", async () => {
    stubPlatform("win32");
    execFileSync.mockReturnValue(JSON.stringify({
      executableName: "PasswordManager.exe",
      executablePath: "C:\\Program Files\\PasswordManager\\PasswordManager.exe"
    }));
    const { getActiveAppIdentity } = await import("../src/main/active-app");

    expect(getActiveAppIdentity()).toEqual({
      platform: "win32",
      executableName: "PasswordManager.exe",
      executablePath: "C:\\Program Files\\PasswordManager\\PasswordManager.exe"
    });
  });

  it("returns null when active app detection fails", async () => {
    stubPlatform("win32");
    execFileSync.mockImplementation(() => {
      throw new Error("blocked");
    });
    const { getActiveAppIdentity } = await import("../src/main/active-app");

    expect(getActiveAppIdentity()).toBeNull();
  });
});
