import { describe, expect, it, vi } from "vitest";
import { buildMenuBarTemplate, type MenuBarActions } from "../src/main/menu-bar";

function createActions(): MenuBarActions {
  return {
    clearHistory: vi.fn(),
    hideDock: vi.fn(),
    openDesktopShell: vi.fn(),
    openPopup: vi.fn(),
    pauseCapture: vi.fn(),
    quit: vi.fn(),
    resumeCapture: vi.fn(),
    showDock: vi.fn(),
    showPrivacy: vi.fn(),
    showSettings: vi.fn()
  };
}

describe("menu bar template", () => {
  it("exposes the expected CopClip commands", () => {
    const template = buildMenuBarTemplate({ capturePaused: false, dockHidden: false }, createActions(), vi.fn());

    expect(template.map((item) => item.label ?? item.type)).toEqual([
      "Open Popup",
      "Open Desktop Shell",
      "separator",
      "Pause Capture",
      "Clear History",
      "separator",
      "Settings",
      "About & Privacy",
      "Hide Dock Icon",
      "separator",
      "Quit"
    ]);
  });

  it("toggles capture state through pause and resume actions", () => {
    const pauseActions = createActions();
    const refreshMenu = vi.fn();
    buildMenuBarTemplate({ capturePaused: false, dockHidden: false }, pauseActions, refreshMenu)[3].click?.({} as never, {} as never, {} as never);
    expect(pauseActions.pauseCapture).toHaveBeenCalledOnce();
    expect(refreshMenu).toHaveBeenCalledOnce();

    const resumeActions = createActions();
    buildMenuBarTemplate({ capturePaused: true, dockHidden: false }, resumeActions, refreshMenu)[3].click?.({} as never, {} as never, {} as never);
    expect(resumeActions.resumeCapture).toHaveBeenCalledOnce();
  });

  it("toggles dock visibility", () => {
    const hideActions = createActions();
    buildMenuBarTemplate({ capturePaused: false, dockHidden: false }, hideActions, vi.fn())[8].click?.({} as never, {} as never, {} as never);
    expect(hideActions.hideDock).toHaveBeenCalledOnce();

    const showActions = createActions();
    buildMenuBarTemplate({ capturePaused: false, dockHidden: true }, showActions, vi.fn())[8].click?.({} as never, {} as never, {} as never);
    expect(showActions.showDock).toHaveBeenCalledOnce();
  });
});
