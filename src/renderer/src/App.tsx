import { useEffect, useState } from "react";
import { defaultCopClipSettings } from "../../shared/app-settings";
import { DesktopShell } from "./features/desktop/DesktopShell";
import { ClipboardPopup } from "./features/popup/ClipboardPopup";
import { currentSurface } from "./lib/surface";

export function App() {
  const [settings, setSettings] = useState(defaultCopClipSettings);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    void window.copclip.getSettings().then(setSettings);
    return window.copclip.onSettingsChanged(setSettings);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  return currentSurface() === "desktop" ? <DesktopShell settings={settings} /> : <ClipboardPopup settings={settings} />;
}
