import { useEffect, useMemo, useState } from "react";
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

export function App() {
  const appInfo = window.copclip?.getAppInfo();
  const [clips, setClips] = useState<ClipboardTextItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(window.copclip));

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!window.copclip) {
        setIsLoadingHistory(false);
        return;
      }

      const items = await window.copclip.listClipboardHistory(query);

      if (isMounted) {
        setClips(items);
        setIsLoadingHistory(false);
      }
    }

    void loadHistory();

    return () => {
      isMounted = false;
    };
  }, [query]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardHistoryChanged((items) => {
      const normalizedQuery = query.trim().toLocaleLowerCase();
      setClips(
        normalizedQuery
          ? items.filter((item) => item.text.toLocaleLowerCase().includes(normalizedQuery))
          : items
      );
    });
  }, [query]);

  const statusText = useMemo(() => {
    if (isLoadingHistory) {
      return "Loading";
    }

    return `${clips.length} item${clips.length === 1 ? "" : "s"}`;
  }, [clips.length, isLoadingHistory]);

  return (
    <main className="stage" aria-label="CopClip app shell">
      <section className="desktop-shell" aria-label="Main CopClip window">
        <div className="window-bar">
          <div className="traffic" aria-label="macOS window controls">
            <span className="dot close" />
            <span className="dot min" />
            <span className="dot max" />
          </div>
          <div className="window-title">CopClip - Clipboard History</div>
          <div className="os-tabs" aria-label="Supported operating system">
            <span className="active">macOS</span>
          </div>
        </div>

        <div className="app-grid">
          <aside className="sidebar" aria-label="CopClip navigation">
            <div className="brand">
              <div className="mark">C</div>
              <div className="brand-text">
                <strong>CopClip</strong>
                <span>Clipboard, organized</span>
              </div>
            </div>

            <nav className="nav" aria-label="Primary">
              <button className="active" type="button">
                <span>History</span>
                <span className="count">{clips.length}</span>
              </button>
              <button type="button">
                <span>Pinned</span>
                <span className="count">0</span>
              </button>
              <button type="button">
                <span>Settings</span>
              </button>
            </nav>

            <div className="privacy-card">
              <strong>
                <span className="status-dot" /> Private by default
              </strong>
              <p>Text history stays in this running app for now. Persistent storage arrives in a later slice.</p>
            </div>
          </aside>

          <section className="history" aria-label="Clipboard popup placeholder">
            <div className="history-top">
              <div className="title-row">
                <h1>Clipboard history</h1>
                <span className="meta">{appInfo ? `${appInfo.name} ${appInfo.version}` : "App shell"}</span>
              </div>
              <p className="subtitle">Copied text appears here while CopClip is running.</p>
              <label className="search">
                <span aria-hidden="true">/</span>
                <input
                  aria-label="Search clipboard history"
                  placeholder="Search clipboard history"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <kbd>Cmd K</kbd>
              </label>
            </div>

            <div className="filters" aria-label="Clipboard filters">
              <button className="chip active" type="button">All</button>
              <button className="chip" type="button">Text</button>
              <button className="chip" type="button">Links</button>
              <button className="chip" type="button">Images</button>
            </div>

            <div className="list" aria-label="Clipboard history results">
              {clips.map((clip) => (
                <article className="clip" key={clip.id}>
                  <div className="clip-icon">TXT</div>
                  <div>
                    <div className="clip-title">
                      <strong>{clipTitle(clip)}</strong>
                    </div>
                    <p>{clip.preview}</p>
                  </div>
                  <span className="meta">{formatClipAge(clip.capturedAt)}</span>
                </article>
              ))}
              {clips.length === 0 ? (
                <div className="empty-state" role="status">
                  {query ? "No matching text clips" : statusText === "Loading" ? "Loading history" : "Copy text to start history"}
                </div>
              ) : null}
            </div>
          </section>

          <aside className="settings" aria-label="Settings placeholder">
            <div className="preview-title">
              <h2>Settings</h2>
              <span>Placeholder</span>
            </div>
            <div className="preview-card">
              <h3>Ready for preferences</h3>
              <p>Hotkey, history limit, popup size, and theme controls will be implemented in a later issue.</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
