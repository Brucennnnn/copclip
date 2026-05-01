export type DestroyableWindow = {
  isDestroyed: () => boolean;
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
