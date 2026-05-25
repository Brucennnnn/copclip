import { useEffect, useState } from "react";
import { defaultCopClipSettings, validateSettings, type CopClipSettings } from "../../shared/app-settings";
import { DesktopShell } from "./features/desktop/DesktopShell";
import { ClipboardPopup } from "./features/popup/ClipboardPopup";
import { currentSurface } from "./lib/surface";

function normalizeRendererSettings(settings: CopClipSettings): CopClipSettings {
  if (
    typeof settings.activePinboardId === "string" &&
    typeof settings.checkForUpdatesAutomatically === "boolean" &&
    Array.isArray(settings.pinboards) &&
    typeof settings.showNextPinboardShortcut === "string" &&
    typeof settings.showPreviousPinboardShortcut === "string"
  ) {
    return settings;
  }

  return validateSettings(settings, defaultCopClipSettings).settings;
}

export function App() {
  const [settings, setSettings] = useState(defaultCopClipSettings);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    void window.copclip.getSettings().then((nextSettings) => setSettings(normalizeRendererSettings(nextSettings)));
    return window.copclip.onSettingsChanged((nextSettings) => setSettings(normalizeRendererSettings(nextSettings)));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  return currentSurface() === "desktop" ? <DesktopShell settings={settings} /> : <ClipboardPopup settings={settings} />;
}
