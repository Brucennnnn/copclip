import { describe, expect, it, vi } from "vitest";
import { enableWaylandGlobalShortcuts, isLinuxWaylandSession } from "../src/main/global-shortcuts";

describe("global shortcut platform setup", () => {
  it("detects Linux Wayland sessions", () => {
    expect(isLinuxWaylandSession("linux", { XDG_SESSION_TYPE: "wayland" })).toBe(true);
    expect(isLinuxWaylandSession("linux", { WAYLAND_DISPLAY: "wayland-1" })).toBe(true);
    expect(isLinuxWaylandSession("linux", { XDG_SESSION_TYPE: "x11" })).toBe(false);
    expect(isLinuxWaylandSession("darwin", { XDG_SESSION_TYPE: "wayland" })).toBe(false);
  });

  it("enables the Electron global shortcut portal on Linux Wayland", () => {
    const commandLine = {
      appendSwitch: vi.fn(),
      getSwitchValue: vi.fn(() => "PdfUseShowSaveFilePicker"),
      hasSwitch: vi.fn(() => true)
    };

    expect(enableWaylandGlobalShortcuts(commandLine, "linux", { XDG_SESSION_TYPE: "wayland" })).toBe(true);
    expect(commandLine.appendSwitch).toHaveBeenCalledWith(
      "enable-features",
      "PdfUseShowSaveFilePicker,GlobalShortcutsPortal"
    );
  });

  it("leaves non-Wayland sessions unchanged", () => {
    const commandLine = {
      appendSwitch: vi.fn()
    };

    expect(enableWaylandGlobalShortcuts(commandLine, "linux", { XDG_SESSION_TYPE: "x11" })).toBe(false);
    expect(commandLine.appendSwitch).not.toHaveBeenCalled();
  });
});
