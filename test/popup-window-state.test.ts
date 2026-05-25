import { describe, expect, it, vi } from "vitest";
import { configurePopupForCurrentMacSpace, ensureLiveWindow, raisePopupAboveCurrentSpace } from "../src/main/popup-window-state";

describe("popup window state", () => {
  it("reuses a live popup window", () => {
    const liveWindow = { isDestroyed: () => false };
    const createWindow = vi.fn(() => ({ isDestroyed: () => false }));

    expect(ensureLiveWindow(liveWindow, createWindow)).toBe(liveWindow);
    expect(createWindow).not.toHaveBeenCalled();
  });

  it("creates a popup window when there is no stored window", () => {
    const nextWindow = { isDestroyed: () => false };
    const createWindow = vi.fn(() => nextWindow);

    expect(ensureLiveWindow(null, createWindow)).toBe(nextWindow);
    expect(createWindow).toHaveBeenCalledOnce();
  });

  it("replaces a destroyed popup window before it can be shown", () => {
    const destroyedWindow = { isDestroyed: () => true };
    const nextWindow = { isDestroyed: () => false };
    const createWindow = vi.fn(() => nextWindow);

    expect(ensureLiveWindow(destroyedWindow, createWindow)).toBe(nextWindow);
    expect(createWindow).toHaveBeenCalledOnce();
  });

  it("configures the popup for the active macOS full-screen Space", () => {
    const setVisibleOnAllWorkspaces = vi.fn();

    configurePopupForCurrentMacSpace({
      setAlwaysOnTop: vi.fn(),
      setVisibleOnAllWorkspaces
    });

    expect(setVisibleOnAllWorkspaces).toHaveBeenCalledWith(true, {
      visibleOnFullScreen: true
    });
  });

  it("raises the popup above full-screen app windows when opening", () => {
    const setAlwaysOnTop = vi.fn();

    raisePopupAboveCurrentSpace({
      setAlwaysOnTop
    });

    expect(setAlwaysOnTop).toHaveBeenCalledWith(true, "pop-up-menu");
  });
});
