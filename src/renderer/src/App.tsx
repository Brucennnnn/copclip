import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SetStateAction } from "react";
import { defaultCopClipSettings, type CopClipSettings, type CopClipSettingsPatch } from "../../shared/app-settings";
import { clipboardItemSearchText, type ClipboardItem } from "../../shared/clipboard-history";
import type { SettingsUpdateResult } from "../../preload/api";

function formatClipAge(capturedAt: string): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(capturedAt)) / 1000));

  if (elapsedSeconds < 60) {
    return "now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}h`;
}

function clipTitle(item: ClipboardItem): string {
  return item.preview.length > 64 ? `${item.preview.slice(0, 61).trimEnd()}...` : item.preview;
}

function clipKindLabel(item: ClipboardItem): string {
  if (item.type === "image") {
    return "IMG";
  }

  return item.type === "link" ? "URL" : "TXT";
}

function filterClips(items: ClipboardItem[], query: string): ClipboardItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return normalizedQuery
    ? items.filter((item) => clipboardItemSearchText(item).toLocaleLowerCase().includes(normalizedQuery))
    : items;
}

type ShortcutKeyboardEvent = Pick<KeyboardEvent | ReactKeyboardEvent<HTMLInputElement>, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

function acceleratorFromKeyboardEvent(event: ShortcutKeyboardEvent): string | null {
  const key = event.key === " " ? "Space" : event.key === "Enter" ? "Return" : event.key.length === 1 ? event.key.toUpperCase() : event.key;

  if (["Alt", "Control", "Meta", "Shift"].includes(key)) {
    return null;
  }

  const parts = [event.metaKey || event.ctrlKey ? "CommandOrControl" : "", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : "", key]
    .filter(Boolean);

  return parts.length >= 2 ? parts.join("+") : null;
}

function currentSurface(): "desktop" | "popup" {
  return new URLSearchParams(window.location.search).get("surface") === "desktop" ? "desktop" : "popup";
}

type SettingsErrors = SettingsUpdateResult["errors"];
type SettingsPage = "general" | "privacy" | "shortcuts" | "subscription";

type SettingsDraft = {
  checkForUpdatesAutomatically: boolean;
  historyLimit: string;
  launchAtLogin: boolean;
  openClipboardHistoryShortcut: string;
  pasteAutomatically: boolean;
  pasteWithFormattingShortcut: string;
  popupPosition: CopClipSettings["popupPosition"];
  popupSize: {
    width: string;
    height: string;
  };
  theme: CopClipSettings["theme"];
};

const settingsPages: Array<{ id: SettingsPage; label: string; icon: string }> = [
  { id: "general", label: "General", icon: "gear" },
  { id: "privacy", label: "Privacy", icon: "hand" },
  { id: "shortcuts", label: "Shortcuts", icon: "keyboard" },
  { id: "subscription", label: "Subscription", icon: "badge" }
];

function createSettingsDraft(settings: CopClipSettings): SettingsDraft {
  return {
    checkForUpdatesAutomatically: settings.checkForUpdatesAutomatically,
    historyLimit: String(settings.historyLimit),
    launchAtLogin: settings.launchAtLogin,
    openClipboardHistoryShortcut: settings.openClipboardHistoryShortcut,
    pasteAutomatically: settings.pasteAutomatically,
    pasteWithFormattingShortcut: settings.pasteWithFormattingShortcut,
    popupPosition: settings.popupPosition,
    popupSize: {
      width: String(settings.popupSize.width),
      height: String(settings.popupSize.height)
    },
    theme: settings.theme
  };
}

function normalizeSettingsPage(hash: string): SettingsPage {
  const page = hash.replace("#", "");

  return page === "privacy" || page === "shortcuts" || page === "subscription" ? page : "general";
}

function settingStatusText(status: string, errors: SettingsErrors): string {
  if (status) {
    return status;
  }

  return Object.keys(errors).length > 0 ? "Check values" : "Local";
}

function SettingsIcon({ name }: { name: string }) {
  return (
    <span className={`settings-icon settings-icon-${name}`} aria-hidden="true" />
  );
}

function ToggleSwitch({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange?: (checked: boolean) => void }) {
  return (
    <label className={`switch-control${disabled ? " is-disabled" : ""}`}>
      <input
        aria-label={label}
        checked={checked}
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span />
    </label>
  );
}

function SettingsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`settings-card${className ? ` ${className}` : ""}`}>{children}</section>;
}

function SettingsRow({ children, note, title }: { children?: ReactNode; note?: string; title: string }) {
  return (
    <div className="settings-list-row">
      <div>
        <strong>{title}</strong>
        {note ? <small>{note}</small> : null}
      </div>
      {children ? <div className="settings-row-control">{children}</div> : null}
    </div>
  );
}

function DisabledControl({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <button className="disabled-control" disabled title={label ?? "Planned feature"} type="button">
      {children}
    </button>
  );
}

function formatAccelerator(accelerator: string): string {
  return accelerator
    .replaceAll("CommandOrControl", "⌘")
    .replaceAll("Command", "⌘")
    .replaceAll("Control", "⌃")
    .replaceAll("Alt", "⌥")
    .replaceAll("Option", "⌥")
    .replaceAll("Shift", "⇧")
    .replaceAll("Return", "↩")
    .replaceAll("+", "");
}

function ShortcutInput({ error, label, value, onChange }: { error?: string; label: string; value: string; onChange: (shortcut: string) => void }) {
  return (
    <label className="shortcut-recorder">
      <span>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        readOnly
        value={formatAccelerator(value)}
        onKeyDown={(event) => {
          event.preventDefault();
          const shortcut = acceleratorFromKeyboardEvent(event);

          if (shortcut) {
            onChange(shortcut);
          }
        }}
      />
      <DisabledControl label="Shortcut clearing is planned">×</DisabledControl>
      {error ? <em>{error}</em> : null}
    </label>
  );
}

function GeneralSettingsPage({
  draftSettings,
  settingsErrors,
  settingsStatus,
  setDraftSettings,
  updateSettings
}: {
  draftSettings: SettingsDraft;
  settingsErrors: SettingsErrors;
  settingsStatus: string;
  setDraftSettings: Dispatch<SetStateAction<SettingsDraft>>;
  updateSettings: (patch: CopClipSettingsPatch) => Promise<void>;
}) {
  const pasteToActiveApp = draftSettings.pasteAutomatically;

  return (
    <>
      <SettingsCard>
        <SettingsRow title="Open at login">
          <ToggleSwitch
            checked={draftSettings.launchAtLogin}
            label="Open at login"
            onChange={(launchAtLogin) => {
              setDraftSettings((current) => ({ ...current, launchAtLogin }));
              void updateSettings({ launchAtLogin });
            }}
          />
        </SettingsRow>
        <SettingsRow note="Keep CopClip available from the menu bar." title="Run in background">
          <ToggleSwitch checked label="Run in background" disabled />
        </SettingsRow>
        <SettingsRow note="Planned for a future cloud-sync milestone." title="iCloud sync">
          <span className="sync-status">Not available</span>
          <ToggleSwitch checked={false} label="iCloud sync" disabled />
        </SettingsRow>
        <SettingsRow note="Uses the existing automatic update preference until updater UI is added." title="Check for updates">
          <ToggleSwitch
            checked={draftSettings.checkForUpdatesAutomatically}
            label="Check for updates"
            onChange={(checkForUpdatesAutomatically) => {
              setDraftSettings((current) => ({ ...current, checkForUpdatesAutomatically }));
              void updateSettings({ checkForUpdatesAutomatically });
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <h2 className="settings-section-title">Paste Items</h2>
      <SettingsCard className="paste-card">
        <label className="radio-setting">
          <input
            aria-label="To active app"
            checked={pasteToActiveApp}
            name="paste-destination"
            type="radio"
            onChange={() => {
              setDraftSettings((current) => ({ ...current, pasteAutomatically: true }));
              void updateSettings({ pasteAutomatically: true });
            }}
          />
          <span>
            <strong>To active app</strong>
            <small>Paste selected items directly to the application you are currently using.</small>
          </span>
          <span className="paste-illustration" aria-hidden="true" />
        </label>
        <label className="radio-setting">
          <input
            aria-label="To clipboard"
            checked={!pasteToActiveApp}
            name="paste-destination"
            type="radio"
            onChange={() => {
              setDraftSettings((current) => ({ ...current, pasteAutomatically: false }));
              void updateSettings({ pasteAutomatically: false });
            }}
          />
          <span>
            <strong>To clipboard</strong>
            <small>Copy selected items to the system clipboard to paste manually later.</small>
          </span>
        </label>
        <SettingsRow title="Always paste as Plain Text">
          <ToggleSwitch checked={false} label="Always paste as Plain Text" disabled />
        </SettingsRow>
      </SettingsCard>

      <h2 className="settings-section-title">Existing Settings</h2>
      <SettingsCard className="legacy-settings-card">
        <label>
          <span>Keep history limit</span>
          <input
            aria-invalid={Boolean(settingsErrors.historyLimit)}
            min={1}
            max={5000}
            type="number"
            value={draftSettings.historyLimit}
            onBlur={() => void updateSettings({ historyLimit: draftSettings.historyLimit })}
            onChange={(event) => setDraftSettings((current) => ({ ...current, historyLimit: event.target.value }))}
          />
          {settingsErrors.historyLimit ? <em>{settingsErrors.historyLimit}</em> : null}
        </label>
        <label>
          <span>Popup location</span>
          <select
            aria-label="Popup location"
            value={draftSettings.popupPosition}
            onChange={(event) => {
              const popupPosition = event.target.value as CopClipSettings["popupPosition"];
              setDraftSettings((current) => ({ ...current, popupPosition }));
              void updateSettings({ popupPosition });
            }}
          >
            <option value="cursor">Drop down at cursor</option>
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="last-position">Last position</option>
          </select>
          {settingsErrors.popupPosition ? <em>{settingsErrors.popupPosition}</em> : null}
        </label>
        <div className="settings-row" aria-label="Popup size">
          <label>
            <span>Popup width</span>
            <input
              aria-invalid={Boolean(settingsErrors["popupSize.width"])}
              min={320}
              max={900}
              type="number"
              value={draftSettings.popupSize.width}
              onBlur={() => void updateSettings({ popupSize: draftSettings.popupSize })}
              onChange={(event) => setDraftSettings((current) => ({ ...current, popupSize: { ...current.popupSize, width: event.target.value } }))}
            />
            {settingsErrors["popupSize.width"] ? <em>{settingsErrors["popupSize.width"]}</em> : null}
          </label>
          <label>
            <span>Popup height</span>
            <input
              aria-invalid={Boolean(settingsErrors["popupSize.height"])}
              min={360}
              max={900}
              type="number"
              value={draftSettings.popupSize.height}
              onBlur={() => void updateSettings({ popupSize: draftSettings.popupSize })}
              onChange={(event) => setDraftSettings((current) => ({ ...current, popupSize: { ...current.popupSize, height: event.target.value } }))}
            />
            {settingsErrors["popupSize.height"] ? <em>{settingsErrors["popupSize.height"]}</em> : null}
          </label>
        </div>
        <label>
          <span>Theme</span>
          <select
            value={draftSettings.theme}
            onChange={(event) => {
              const theme = event.target.value as CopClipSettings["theme"];
              setDraftSettings((current) => ({ ...current, theme }));
              void updateSettings({ theme });
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          {settingsErrors.theme ? <em>{settingsErrors.theme}</em> : null}
        </label>
        <span className="save-status" role="status">{settingStatusText(settingsStatus, settingsErrors)}</span>
      </SettingsCard>
    </>
  );
}

function PrivacySettingsPage() {
  return (
    <>
      <SettingsCard>
        <SettingsRow note="Allow CopClip to appear to others when you share your screen." title="Show during screen sharing">
          <ToggleSwitch checked={false} label="Show during screen sharing" disabled />
        </SettingsRow>
        <SettingsRow note="Download web content for previews; may activate one-time or analytics-sensitive links." title="Generate link previews">
          <ToggleSwitch checked={false} label="Generate link previews" disabled />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow note="Do not save passwords and sensitive data when detected." title="Ignore confidential content">
          <ToggleSwitch checked={false} label="Ignore confidential content" disabled />
        </SettingsRow>
        <SettingsRow note="Do not save temporary data generated by other apps." title="Ignore transient content">
          <ToggleSwitch checked={false} label="Ignore transient content" disabled />
        </SettingsRow>
      </SettingsCard>

      <h2 className="settings-section-title">Ignore Applications</h2>
      <p className="settings-section-copy">Do not save content copied from the applications below.</p>
      <SettingsCard className="ignored-apps-card">
        <div className="ignored-app-row"><span className="app-icon keychain" />Keychain Access</div>
        <div className="ignored-app-row"><span className="app-icon passwords" />Passwords</div>
        <div className="ignored-app-actions" aria-label="Ignored application actions">
          <DisabledControl label="Adding ignored apps is planned">+</DisabledControl>
          <DisabledControl label="Removing ignored apps is planned">−</DisabledControl>
        </div>
      </SettingsCard>
    </>
  );
}

function ShortcutsSettingsPage({
  draftSettings,
  settingsErrors,
  setDraftSettings,
  updateSettings
}: {
  draftSettings: SettingsDraft;
  settingsErrors: SettingsErrors;
  setDraftSettings: Dispatch<SetStateAction<SettingsDraft>>;
  updateSettings: (patch: CopClipSettingsPatch) => Promise<void>;
}) {
  return (
    <>
      <SettingsCard className="shortcuts-card">
        <ShortcutInput
          error={settingsErrors.openClipboardHistoryShortcut}
          label="Activate Paste"
          value={draftSettings.openClipboardHistoryShortcut}
          onChange={(openClipboardHistoryShortcut) => {
            setDraftSettings((current) => ({ ...current, openClipboardHistoryShortcut }));
            void updateSettings({ openClipboardHistoryShortcut });
          }}
        />
        <ShortcutInput
          error={settingsErrors.pasteWithFormattingShortcut}
          label="Activate Paste Stack"
          value={draftSettings.pasteWithFormattingShortcut}
          onChange={(pasteWithFormattingShortcut) => {
            setDraftSettings((current) => ({ ...current, pasteWithFormattingShortcut }));
            void updateSettings({ pasteWithFormattingShortcut });
          }}
        />
      </SettingsCard>

      <SettingsCard className="shortcuts-card">
        <SettingsRow title="Show next Pinboard"><DisabledControl>⌘→ ×</DisabledControl></SettingsRow>
        <SettingsRow title="Show previous Pinboard"><DisabledControl>⌘← ×</DisabledControl></SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow title="Quick Paste"><span className="shortcut-note">⌘ Command ⇧ + 1...9</span></SettingsRow>
        <SettingsRow title="Plain Text mode"><span className="shortcut-note">⇧ Shift ⇧</span></SettingsRow>
      </SettingsCard>
      <div className="settings-actions"><DisabledControl label="Reset shortcuts is planned">Reset shortcuts to default...</DisabledControl></div>
    </>
  );
}

function SubscriptionSettingsPage() {
  return (
    <SettingsCard className="subscription-card">
      <span className="subscription-icon" aria-hidden="true">P</span>
      <div>
        <strong>CopClip</strong>
        <small>Local build</small>
      </div>
      <DisabledControl label="Subscription management is planned">Manage...</DisabledControl>
    </SettingsCard>
  );
}

function DesktopShell({ settings }: { settings: CopClipSettings }) {
  const appInfo = window.copclip?.getAppInfo();
  const [activePage, setActivePage] = useState<SettingsPage>(() => normalizeSettingsPage(window.location.hash));
  const [draftSettings, setDraftSettings] = useState(() => createSettingsDraft(settings));
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});
  const [settingsStatus, setSettingsStatus] = useState("");

  useEffect(() => {
    function handleHashChange() {
      setActivePage(normalizeSettingsPage(window.location.hash));
    }

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setDraftSettings(createSettingsDraft(settings));
  }, [settings]);

  const updateSettings = useCallback(async (patch: CopClipSettingsPatch) => {
    if (!window.copclip) {
      return;
    }

    const result = await window.copclip.updateSettings(patch);
    setSettingsErrors(result.errors);
    setSettingsStatus(result.ok ? "Saved" : "Check values");

    if (result.ok) {
      setDraftSettings(createSettingsDraft(result.settings));
    }
  }, []);

  const pageTitle = settingsPages.find((page) => page.id === activePage)?.label ?? "General";

  function choosePage(page: SettingsPage) {
    setActivePage(page);
    window.history.replaceState(null, "", `#${page}`);
  }

  function renderActivePage() {
    if (activePage === "privacy") {
      return <PrivacySettingsPage />;
    }

    if (activePage === "shortcuts") {
      return (
        <ShortcutsSettingsPage
          draftSettings={draftSettings}
          settingsErrors={settingsErrors}
          setDraftSettings={setDraftSettings}
          updateSettings={updateSettings}
        />
      );
    }

    if (activePage === "subscription") {
      return <SubscriptionSettingsPage />;
    }

    return (
      <GeneralSettingsPage
        draftSettings={draftSettings}
        settingsErrors={settingsErrors}
        settingsStatus={settingsStatus}
        setDraftSettings={setDraftSettings}
        updateSettings={updateSettings}
      />
    );
  }

  return (
    <main className="desktop-shell" aria-label="CopClip desktop shell">
      <aside className="desktop-nav" aria-label="CopClip navigation">
        <div className="settings-sidebar-top">
          <div className="traffic-light-spacer" aria-hidden="true" />
          <nav aria-label="Settings pages">
            {settingsPages.map((page) => (
              <button
                aria-current={activePage === page.id ? "page" : undefined}
                key={page.id}
                type="button"
                onClick={() => choosePage(page.id)}
              >
                <SettingsIcon name={page.icon} />
                <span>{page.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <button className="help-link" disabled type="button">
          <span aria-hidden="true">?</span>
          Help Center
        </button>
      </aside>

      <section className="desktop-content">
        <header className="desktop-header">
          <div>
            <h1>{pageTitle}</h1>
            <p>{appInfo ? `${appInfo.name} ${appInfo.version}` : "CopClip settings"}</p>
          </div>
          <span className="status-pill">{settingStatusText(settingsStatus, settingsErrors)}</span>
        </header>

        <form className="settings-form" aria-label="CopClip settings">
          {renderActivePage()}
        </form>
      </section>
    </main>
  );
}

function ClipboardPopup({ settings }: { settings: CopClipSettings }) {
  const appInfo = window.copclip?.getAppInfo();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [clips, setClips] = useState<ClipboardItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(window.copclip));
  const [selectedIndex, setSelectedIndex] = useState(0);

  const loadHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory(query);

    setClips(items);
    setIsLoadingHistory(false);
  }, [query]);

  const refreshPopupHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory("");

    setQuery("");
    setClips(items);
    setIsLoadingHistory(false);
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardHistoryChanged((items) => {
      setClips(filterClips(items, query));
    });
  }, [query]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardPopupOpened(() => {
      void refreshPopupHistory();
    });
  }, [refreshPopupHistory]);

  useEffect(() => {
    window.addEventListener("focus", refreshPopupHistory);
    return () => {
      window.removeEventListener("focus", refreshPopupHistory);
    };
  }, [refreshPopupHistory]);

  useEffect(() => {
    setSelectedIndex((currentIndex) => {
      if (clips.length === 0) {
        return 0;
      }

      return Math.min(Math.max(currentIndex, 0), clips.length - 1);
    });
  }, [clips.length]);

  const restoreClip = useCallback(async (clip: ClipboardItem | undefined) => {
    if (!clip || !window.copclip) {
      return;
    }

    await window.copclip.restoreClipboardItem(clip.id);
  }, []);

  const dismissPopup = useCallback(() => {
    void window.copclip?.dismissClipboardPopup();
  }, []);

  useEffect(() => {
    function handlePopupKeyDown(event: KeyboardEvent) {
      if (event.key === "," && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void window.copclip?.openSettings();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dismissPopup();
        return;
      }

      if (clips.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => Math.min(currentIndex + 1, clips.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
        return;
      }

      if (acceleratorFromKeyboardEvent(event) === settings.pasteWithFormattingShortcut) {
        event.preventDefault();
        void restoreClip(clips[selectedIndex]);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void restoreClip(clips[selectedIndex]);
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const shortcutIndex = Number(event.key) - 1;

        if (shortcutIndex < clips.length) {
          event.preventDefault();
          setSelectedIndex(shortcutIndex);
          void restoreClip(clips[shortcutIndex]);
        }
      }
    }

    window.addEventListener("keydown", handlePopupKeyDown);
    return () => {
      window.removeEventListener("keydown", handlePopupKeyDown);
    };
  }, [clips, dismissPopup, restoreClip, selectedIndex, settings.pasteWithFormattingShortcut]);

  const statusText = useMemo(() => {
    if (isLoadingHistory) {
      return "Loading";
    }

    return `${clips.length} item${clips.length === 1 ? "" : "s"}`;
  }, [clips.length, isLoadingHistory]);

  return (
    <main className="popup-stage" aria-label="CopClip clipboard popup">
      <section className="clipboard-popup" aria-label="Clipboard popup">
        <div className="history-top">
          <div className="title-row">
              <h1>Clipboard history</h1>
              <span className="meta">{appInfo ? `${appInfo.name} ${appInfo.version}` : statusText}</span>
            </div>
            <label className="search">
              <span aria-hidden="true">/</span>
              <input
                aria-label="Search clipboard history"
                placeholder="Search copied text, links, or images"
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
            />
            <kbd>Esc</kbd>
          </label>
        </div>

        <div className="list" aria-label="Clipboard history results">
          {clips.map((clip, index) => (
            <button
              aria-label={`Restore clipboard item ${index + 1}: ${clip.preview}`}
              aria-selected={index === selectedIndex}
              className={`clip${index === selectedIndex ? " selected" : ""}`}
              key={clip.id}
              onClick={() => void restoreClip(clip)}
              onMouseEnter={() => setSelectedIndex(index)}
              type="button"
            >
              <div className="clip-icon">{clipKindLabel(clip)}</div>
              <div>
                <div className="clip-title">
                  <span className="shortcut">{index + 1}</span>
                  <strong>{clipTitle(clip)}</strong>
                </div>
                {clip.type === "image" ? (
                  <div className="clip-image-preview">
                    <img alt="" src={clip.imageDataUrl} />
                    <p>{clip.preview}</p>
                  </div>
                ) : (
                  <p>{clip.preview}</p>
                )}
              </div>
              <span className="meta">{formatClipAge(clip.capturedAt)}</span>
            </button>
          ))}
          {clips.length === 0 ? (
            <div className="empty-state" role="status">
              {query ? "No matching clips" : statusText === "Loading" ? "Loading history" : "Copy text, links, or images to start history"}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

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
