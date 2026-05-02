import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClipboardTextItem } from "../../shared/clipboard-history";

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

function clipTitle(item: ClipboardTextItem): string {
  return item.preview.length > 64 ? `${item.preview.slice(0, 61).trimEnd()}...` : item.preview;
}

function filterClips(items: ClipboardTextItem[], query: string): ClipboardTextItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return normalizedQuery
    ? items.filter((item) => item.text.toLocaleLowerCase().includes(normalizedQuery))
    : items;
}

function currentSurface(): "desktop" | "popup" {
  return new URLSearchParams(window.location.search).get("surface") === "desktop" ? "desktop" : "popup";
}

function DesktopShell() {
  const appInfo = window.copclip?.getAppInfo();
  const [clips, setClips] = useState<ClipboardTextItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(window.copclip));

  const loadHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory("");
    setClips(items);
    setIsLoadingHistory(false);
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardHistoryChanged((items) => {
      setClips(items);
    });
  }, []);

  const recentClips = clips.slice(0, 5);

  return (
    <main className="desktop-shell" aria-label="CopClip desktop shell">
      <aside className="desktop-nav" aria-label="CopClip navigation">
        <div>
          <p className="brand">CopClip</p>
          <span className="meta">{appInfo ? `${appInfo.name} ${appInfo.version}` : "Desktop"}</span>
        </div>
        <nav>
          <a aria-current="page" href="#history">History</a>
          <a href="#settings">Settings</a>
          <a href="#privacy">Privacy</a>
          <a href="#advanced">Advanced</a>
        </nav>
      </aside>

      <section className="desktop-content">
        <header className="desktop-header">
          <div>
            <h1>History</h1>
            <p>Review recent clips and manage CopClip configuration from the main app window.</p>
          </div>
          <span className="status-pill">{isLoadingHistory ? "Loading" : `${clips.length} text clips`}</span>
        </header>

        <div className="desktop-grid">
          <section className="desktop-panel" id="history" aria-label="Recent clipboard history">
            <div className="panel-heading">
              <h2>Recent Text Clips</h2>
              <span className="meta">{recentClips.length} shown</span>
            </div>
            <div className="desktop-list">
              {recentClips.map((clip) => (
                <article className="desktop-clip" key={clip.id}>
                  <strong>{clipTitle(clip)}</strong>
                  <p>{clip.preview}</p>
                  <span className="meta">{formatClipAge(clip.capturedAt)}</span>
                </article>
              ))}
              {recentClips.length === 0 ? (
                <div className="empty-state" role="status">
                  {isLoadingHistory ? "Loading history" : "Copy text to start history"}
                </div>
              ) : null}
            </div>
          </section>

          <section className="desktop-panel" id="settings" aria-label="Settings">
            <div className="panel-heading">
              <h2>Settings</h2>
              <span className="meta">Planned</span>
            </div>
            <div className="settings-list">
              <div>
                <strong>Global hotkey</strong>
                <span>Command+Shift+V</span>
              </div>
              <div>
                <strong>Popup size</strong>
                <span>400 x 500</span>
              </div>
              <div>
                <strong>History limit</strong>
                <span>Pending SQLite storage</span>
              </div>
            </div>
          </section>

          <section className="desktop-panel" id="privacy" aria-label="Privacy and local storage">
            <div className="panel-heading">
              <h2>Privacy</h2>
              <span className="meta">Local</span>
            </div>
            <p className="panel-copy">
              Clipboard history is kept on this Mac. Pause capture and ignored-app controls will live here as the desktop shell grows.
            </p>
          </section>

          <section className="desktop-panel" id="advanced" aria-label="Advanced controls">
            <div className="panel-heading">
              <h2>Advanced</h2>
              <span className="meta">Planned</span>
            </div>
            <p className="panel-copy">
              Pinning, deletion, clear history, rich clipboard types, and import or export controls will extend this area.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}

function ClipboardPopup() {
  const appInfo = window.copclip?.getAppInfo();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [clips, setClips] = useState<ClipboardTextItem[]>([]);
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

  const restoreClip = useCallback(async (clip: ClipboardTextItem | undefined) => {
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
  }, [clips, dismissPopup, restoreClip, selectedIndex]);

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
              placeholder="Search copied text"
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
              <div className="clip-icon">TXT</div>
              <div>
                <div className="clip-title">
                  <span className="shortcut">{index + 1}</span>
                  <strong>{clipTitle(clip)}</strong>
                </div>
                <p>{clip.preview}</p>
              </div>
              <span className="meta">{formatClipAge(clip.capturedAt)}</span>
            </button>
          ))}
          {clips.length === 0 ? (
            <div className="empty-state" role="status">
              {query ? "No matching text clips" : statusText === "Loading" ? "Loading history" : "Copy text to start history"}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function App() {
  return currentSurface() === "desktop" ? <DesktopShell /> : <ClipboardPopup />;
}
