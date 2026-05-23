import { BroomIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CopClipSettings } from "../../../../shared/app-settings";
import type { ClipboardItem } from "../../../../shared/clipboard-history";
import { ClipActionButtons } from "../../components/ClipActionButtons";
import { ClipKindIcon } from "../../components/ClipKindIcon";
import { ClipPreview } from "../../components/ClipPreview";
import { PinBadge } from "../../components/PinBadge";
import { acceleratorFromKeyboardEvent } from "../../lib/shortcuts";
import { clipTitle, filterClips, formatClipAge } from "../../lib/clipboard-ui";
import { performHistoryAction, type HistoryAction } from "../../lib/history-actions";
import { cx, drag, noDrag } from "../../lib/styles";

export function ClipboardPopup({ settings }: { settings: CopClipSettings }) {
  const appInfo = window.copclip?.getAppInfo();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const clipButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
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

  useEffect(() => {
    const selectedButton = clipButtonRefs.current[selectedIndex];

    if (typeof selectedButton?.scrollIntoView === "function") {
      selectedButton.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, clips.length]);

  const restoreClip = useCallback(async (clip: ClipboardItem | undefined) => {
    if (!clip || !window.copclip) {
      return;
    }

    await window.copclip.restoreClipboardItem(clip.id);
  }, []);

  const dismissPopup = useCallback(() => {
    void window.copclip?.dismissClipboardPopup();
  }, []);

  const applyPopupHistoryAction = useCallback(async (action: HistoryAction, clip?: ClipboardItem) => {
    const items = await performHistoryAction(action, clip, clips);
    setClips(filterClips(items, query));
  }, [clips, query]);

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
    <main className="min-h-screen p-0" aria-label="CopClip clipboard popup">
      <section className="box-border flex h-screen flex-col overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_60px_color-mix(in_oklch,var(--fg)_12%,transparent)]" aria-label="Clipboard popup">
        <div className="shrink-0 border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--surface)_92%,var(--bg))] px-[18px] pb-3.5 pt-[18px]">
          <div className={cx("mb-3.5 flex items-center justify-between gap-4", drag)}>
            <h1 className="text-[22px] font-bold leading-tight text-[var(--fg)]">Clipboard history</h1>
            <div className="flex items-center gap-2.5">
              <button
                className={cx("inline-flex min-h-[26px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50", noDrag)}
                disabled={clips.length === 0}
                type="button"
                onClick={() => void applyPopupHistoryAction("clear")}
              >
                <BroomIcon aria-hidden="true" size={13} weight="bold" />
                Clear
              </button>
              <span className="font-mono text-[11px] text-[var(--muted)]">{appInfo ? `${appInfo.name} ${appInfo.version}` : statusText}</span>
            </div>
          </div>
          <label className={cx("flex h-11 items-center gap-2.5 rounded-[10px] border border-[color-mix(in_oklch,var(--accent)_36%,var(--border))] bg-[var(--surface)] px-3 shadow-[0_0_0_4px_color-mix(in_oklch,var(--accent)_8%,transparent)]", noDrag)}>
            <MagnifyingGlassIcon aria-hidden="true" className="text-[var(--muted)]" size={17} />
            <input
              aria-label="Search clipboard history"
              className="w-full border-0 bg-transparent text-[15px] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
              placeholder="Search copied text, links, or images"
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd className="inline-flex min-w-[30px] justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fg)]">Esc</kbd>
          </label>
        </div>

        <div className={cx("grid min-h-0 flex-1 content-start overflow-y-auto", noDrag)} aria-label="Clipboard history results">
          {clips.map((clip, index) => (
            <div
              className={cx("group relative border-b border-[var(--border)]", clip.pinned && "pinned")}
              key={clip.id}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <button
                aria-label={`Restore clipboard item ${index + 1}: ${clip.preview}`}
                aria-selected={index === selectedIndex}
                className={cx(
                  "grid min-h-[86px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3 bg-transparent py-[15px] pl-[18px] pr-28 text-left text-[var(--fg)] outline-none hover:bg-[color-mix(in_oklch,var(--accent-soft)_74%,var(--surface))] focus-visible:bg-[color-mix(in_oklch,var(--accent-soft)_74%,var(--surface))]",
                  index === selectedIndex && "bg-[color-mix(in_oklch,var(--accent-soft)_74%,var(--surface))] shadow-[inset_3px_0_0_var(--accent)]"
                )}
                ref={(element) => {
                  clipButtonRefs.current[index] = element;
                }}
                type="button"
                onClick={() => void restoreClip(clip)}
              >
                <ClipKindIcon item={clip} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] font-mono text-[11px] text-[var(--muted)]">{index + 1}</span>
                    <strong className="truncate text-sm font-semibold text-[var(--fg)]">{clipTitle(clip)}</strong>
                    <PinBadge pinned={clip.pinned} />
                  </div>
                  <ClipPreview item={clip} />
                </div>
                <span className="font-mono text-[11px] text-[var(--muted)]">{formatClipAge(clip.capturedAt)}</span>
              </button>
              <div className="absolute right-3.5 top-3.5">
                <ClipActionButtons
                  item={clip}
                  onDelete={() => void applyPopupHistoryAction("delete", clip)}
                  onPinToggle={() => void applyPopupHistoryAction(clip.pinned ? "unpin" : "pin", clip)}
                />
              </div>
            </div>
          ))}
          {clips.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center p-7 text-sm text-[var(--muted)]" role="status">
              {query ? "No matching clips" : statusText === "Loading" ? "Loading history" : "Copy text, links, or images to start history"}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
