import type { MenuItemConstructorOptions } from "electron";

export type MenuBarState = {
  capturePaused: boolean;
  dockHidden: boolean;
};

export type MenuBarActions = {
  clearHistory: () => void;
  hideDock: () => void;
  openDesktopShell: () => void;
  openPopup: () => void;
  quit: () => void;
  resumeCapture: () => void;
  showDock: () => void;
  showPrivacy: () => void;
  showSettings: () => void;
  pauseCapture: () => void;
};

export function buildMenuBarTemplate(
  state: MenuBarState,
  actions: MenuBarActions,
  refreshMenu: () => void
): MenuItemConstructorOptions[] {
  return [
    {
      label: "Open Popup",
      click: actions.openPopup
    },
    {
      label: "Open Desktop Shell",
      click: actions.openDesktopShell
    },
    { type: "separator" },
    {
      label: state.capturePaused ? "Resume Capture" : "Pause Capture",
      click: () => {
        if (state.capturePaused) {
          actions.resumeCapture();
        } else {
          actions.pauseCapture();
        }

        refreshMenu();
      }
    },
    {
      label: "Clear History",
      click: actions.clearHistory
    },
    { type: "separator" },
    {
      label: "Settings",
      click: actions.showSettings
    },
    {
      label: "About & Privacy",
      click: actions.showPrivacy
    },
    {
      checked: state.dockHidden,
      label: "Hide Dock Icon",
      type: "checkbox",
      click: () => {
        if (state.dockHidden) {
          actions.showDock();
        } else {
          actions.hideDock();
        }

        refreshMenu();
      }
    },
    { type: "separator" },
    {
      label: "Quit",
      click: actions.quit
    }
  ];
}
