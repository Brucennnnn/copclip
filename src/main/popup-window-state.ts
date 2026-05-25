export type DestroyableWindow = {
  isDestroyed: () => boolean;
};

type WindowLevel =
  | "normal"
  | "floating"
  | "torn-off-menu"
  | "modal-panel"
  | "main-menu"
  | "status"
  | "pop-up-menu"
  | "screen-saver"
  | "dock";

export type PopupSpaceWindow = {
  setAlwaysOnTop: (flag: boolean, level?: WindowLevel, relativeLevel?: number) => void;
  setVisibleOnAllWorkspaces?: (
    visible: boolean,
    options?: {
      visibleOnFullScreen?: boolean;
    }
  ) => void;
};

export function ensureLiveWindow<TWindow extends DestroyableWindow>(
  window: TWindow | null,
  createWindow: () => TWindow
): TWindow {
  if (!window || window.isDestroyed()) {
    return createWindow();
  }

  return window;
}

export function configurePopupForCurrentMacSpace(window: PopupSpaceWindow): void {
  window.setVisibleOnAllWorkspaces?.(true, {
    visibleOnFullScreen: true
  });
}

export function raisePopupAboveCurrentSpace(window: PopupSpaceWindow): void {
  window.setAlwaysOnTop(true, "pop-up-menu");
}
