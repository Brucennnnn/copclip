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

export function App() {
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

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

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

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardPopupOpened(() => {
      void loadHistory();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    });
  }, [loadHistory]);

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
            <div className="title-actions">
              <span className="meta">{appInfo ? `${appInfo.name} ${appInfo.version}` : statusText}</span>
              <button
                aria-label="Close clipboard popup"
                className="close-button"
                onClick={dismissPopup}
                onMouseDown={(event) => {
                  event.preventDefault();
                  dismissPopup();
                }}
                title="Close"
                type="button"
              >
                ×
              </button>
            </div>
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
