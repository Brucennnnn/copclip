import { BroomIcon, GearSixIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CopClipSettings } from "../../../../shared/app-settings";
import type { ClipboardItem } from "../../../../shared/clipboard-history";
import { ClipActionButtons } from "../../components/ClipActionButtons";
import { acceleratorFromKeyboardEvent } from "../../lib/shortcuts";
import { clipKind, clipTitle, filterClips, formatClipAge } from "../../lib/clipboard-ui";
import { performHistoryAction, type HistoryAction } from "../../lib/history-actions";
import { cx, drag, noDrag } from "../../lib/styles";

function typeboxClass(item: ClipboardItem): string {
  if (item.type === "image") {
    return "text-[oklch(75%_0.15_82)]";
  }

  if (item.type === "link") {
    return "text-[oklch(70%_0.16_220)]";
  }

  if (item.type === "text") {
    return "text-[var(--popup-muted)]";
  }

  return "text-[oklch(74%_0.13_252)]";
}

function popupKindLabel(item: ClipboardItem): string {
  if (item.type === "image") {
    return "Image";
  }

  if (item.type === "link") {
    return "Link";
  }

  if (item.type === "text") {
    return "Note";
  }

  return "HTML";
}

export function highlightSearchMatches(text: string, query: string): ReactNode {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return text;
  }

  const normalizedText = text.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery);

  while (matchIndex !== -1) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    const matchEnd = matchIndex + normalizedQuery.length;
    parts.push(
      <mark className="rounded-[4px] bg-[var(--popup-mark-bg)] px-0.5 text-[var(--popup-mark-fg)]" key={`${matchIndex}-${matchEnd}`}>
        {text.slice(matchIndex, matchEnd)}
      </mark>
    );

    cursor = matchEnd;
    matchIndex = normalizedText.indexOf(normalizedQuery, cursor);
  }

  if (cursor === 0) {
    return text;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
}

export function nextScrollTopForRow({
  direction = "nearest",
  padding,
  rowHeight,
  rowTop,
  scrollHeight,
  viewportHeight,
  visibleTop
}: {
  direction?: "down" | "nearest" | "up";
  padding: number;
  rowHeight: number;
  rowTop: number;
  scrollHeight: number;
  viewportHeight: number;
  visibleTop: number;
}): number {
  const rowBottom = rowTop + rowHeight;
  const visibleBottom = visibleTop + viewportHeight;
  const maxScrollTop = Math.max(0, scrollHeight - viewportHeight);

  if (direction === "up") {
    return Math.min(Math.max(rowTop - padding, 0), maxScrollTop);
  }

  const nextScrollTop =
    rowTop - padding < visibleTop
      ? rowTop - padding
      : rowBottom + padding > visibleBottom
        ? rowBottom + padding - viewportHeight
        : visibleTop;

  return Math.min(Math.max(nextScrollTop, 0), maxScrollTop);
}

export function rowTopWithinScrollPane({
  rowViewportTop,
  scrollPaneViewportTop,
  visibleTop
}: {
  rowViewportTop: number;
  scrollPaneViewportTop: number;
  visibleTop: number;
}): number {
  return rowViewportTop - scrollPaneViewportTop + visibleTop;
}

type ScrollPaneTarget = {
  scrollTop: number;
  scrollTo?: (options: ScrollToOptions) => void;
};

function allowsSmoothScroll(): boolean {
  if (typeof window.matchMedia !== "function") {
    return true;
  }

  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollPaneToTop(scrollPane: ScrollPaneTarget, top: number, behavior: ScrollBehavior): void {
  if (behavior === "smooth" && allowsSmoothScroll() && typeof scrollPane.scrollTo === "function") {
    scrollPane.scrollTo({ top, behavior: "smooth" });
    return;
  }

  scrollPane.scrollTop = top;
}

export function ClipboardPopup({ settings }: { settings: CopClipSettings }) {
  const appInfo = window.copclip?.getAppInfo();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsPaneRef = useRef<HTMLDivElement>(null);
  const clipButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const clipRowRefs = useRef<Array<HTMLElement | null>>([]);
  const keyboardDirectionRef = useRef<"down" | "nearest" | "up">("nearest");
  const lastPointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const selectionSourceRef = useRef<"keyboard" | "pointer" | "programmatic">("programmatic");
  const [clips, setClips] = useState<ClipboardItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(window.copclip));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsListId = "clipboard-history-results";
  const activeOptionId = clips.length > 0 ? `clipboard-history-option-${selectedIndex}` : undefined;

  const loadHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory(query);

    selectionSourceRef.current = "programmatic";
    setSelectedIndex(0);
    setClips(items);
    setIsLoadingHistory(false);
  }, [query]);

  const refreshPopupHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory("");

    selectionSourceRef.current = "programmatic";
    setSelectedIndex(0);
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
    if (selectionSourceRef.current !== "keyboard") {
      return;
    }

    const resultsPane = resultsPaneRef.current;
    const selectedRow = clipRowRefs.current[selectedIndex];

    if (!resultsPane || !selectedRow) {
      return;
    }

    const rowRect = selectedRow.getBoundingClientRect();
    const resultsPaneRect = resultsPane.getBoundingClientRect();
    const rowTop = rowTopWithinScrollPane({
      rowViewportTop: rowRect.top,
      scrollPaneViewportTop: resultsPaneRect.top,
      visibleTop: resultsPane.scrollTop
    });

    const nextScrollTop = nextScrollTopForRow({
      direction: keyboardDirectionRef.current,
      padding: 8,
      rowHeight: selectedRow.offsetHeight,
      rowTop,
      scrollHeight: resultsPane.scrollHeight,
      viewportHeight: resultsPane.clientHeight,
      visibleTop: resultsPane.scrollTop
    });

    if (nextScrollTop !== resultsPane.scrollTop) {
      scrollPaneToTop(resultsPane, nextScrollTop, "smooth");
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
        keyboardDirectionRef.current = "down";
        selectionSourceRef.current = "keyboard";
        setSelectedIndex((currentIndex) => Math.min(currentIndex + 1, clips.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        keyboardDirectionRef.current = "up";
        selectionSourceRef.current = "keyboard";
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
          keyboardDirectionRef.current = "nearest";
          selectionSourceRef.current = "keyboard";
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
    <main className="h-screen bg-transparent text-[var(--popup-fg)] antialiased" aria-label="CopClip clipboard popup">
      <section className="box-border flex h-screen flex-col overflow-hidden border border-[var(--popup-border)] [background:var(--popup-bg)] shadow-[var(--popup-shadow)] backdrop-blur-[28px] [backdrop-filter:blur(28px)_saturate(120%)]" aria-label="Clipboard popup">
          <div className={cx("grid shrink-0 grid-cols-[1fr_auto] gap-5 px-[19px] pb-2.5 pt-[18px]", drag)}>
            <div className="min-w-0">
              <h1 className="m-0 text-[21px] font-bold leading-none text-[var(--popup-fg)]">History</h1>
              <div className="mt-[7px] text-[13px] text-[var(--popup-muted)]">{appInfo ? `${appInfo.name} ${appInfo.version}` : statusText}</div>
            </div>
            <div className="self-start rounded-full border border-[var(--popup-soft-border)] bg-[var(--popup-control)] px-2.5 py-[7px] text-xs text-[var(--popup-muted)]">Local</div>
          </div>

          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-12 px-[19px] pb-4 pt-2.5 max-[760px]:grid-cols-1 max-[760px]:gap-2.5">
            <label className={cx("grid h-10 grid-cols-[26px_1fr] items-center gap-1 rounded-[10px] border border-[var(--popup-soft-border)] bg-[var(--popup-search-bg)] px-[11px] shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)]", noDrag)}>
              <MagnifyingGlassIcon aria-hidden="true" className="text-[var(--popup-muted)]" size={18} />
              <input
                aria-label="Search clipboard history"
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
                aria-controls={resultsListId}
                aria-expanded="true"
                className="h-full min-w-0 border-0 bg-transparent text-[15px] text-[var(--popup-fg)] outline-none placeholder:text-[var(--popup-muted)]"
                placeholder="Search history..."
                ref={searchInputRef}
                role="combobox"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <button
              className={cx("inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[10px] border border-[var(--popup-soft-border)] bg-[var(--popup-control)] px-[13px] text-sm font-semibold text-[var(--popup-fg)] transition hover:-translate-y-px hover:bg-[var(--popup-control-hover)] disabled:cursor-not-allowed disabled:opacity-50 max-[760px]:justify-center", noDrag)}
              disabled={clips.length === 0}
              type="button"
              onClick={() => void applyPopupHistoryAction("clear")}
            >
              <BroomIcon aria-hidden="true" size={16} weight="bold" />
              Clear history
            </button>
          </div>

          <div className={cx("min-h-0 flex-1 overflow-y-auto", noDrag)} ref={resultsPaneRef} aria-label="Clipboard history results" id={resultsListId} role="listbox">
            {clips.map((clip, index) => {
              const { Icon } = clipKind(clip);
              const selected = index === selectedIndex;

              return (
                <article
                  aria-selected={selected}
                  className={cx(
                    "group grid min-h-[95px] grid-cols-[58px_minmax(0,1fr)_58px_auto] items-start gap-3.5 border-b border-[var(--popup-soft-border)] px-[15px] py-[15px] pl-3 transition last:border-b-0 hover:bg-[var(--popup-row-hover)] max-[760px]:grid-cols-[48px_minmax(0,1fr)]",
                    selected && "bg-[var(--popup-row-selected)]"
                  )}
                  id={`clipboard-history-option-${index}`}
                  key={clip.id}
                  onPointerMove={(event) => {
                    const lastPointerPosition = lastPointerPositionRef.current;

                    if (lastPointerPosition && lastPointerPosition.x === event.clientX && lastPointerPosition.y === event.clientY) {
                      return;
                    }

                    lastPointerPositionRef.current = { x: event.clientX, y: event.clientY };
                    selectionSourceRef.current = "pointer";
                    setSelectedIndex(index);
                  }}
                  ref={(element) => {
                    clipRowRefs.current[index] = element;
                  }}
                  role="option"
                >
                  <div className={cx("grid h-[58px] w-[52px] place-items-center content-center gap-1 rounded-[10px] border border-[var(--popup-soft-border)] bg-[var(--popup-icon-bg)] text-[11px]", typeboxClass(clip))}>
                    <Icon aria-hidden="true" size={23} weight="duotone" />
                    <span className="text-[10px] text-[var(--popup-muted)]">{popupKindLabel(clip)}</span>
                  </div>
                  <button
                    aria-label={`Restore clipboard item ${index + 1}: ${clip.preview}`}
                    aria-selected={selected}
                    className="min-w-0 bg-transparent text-left outline-none"
                    ref={(element) => {
                      clipButtonRefs.current[index] = element;
                    }}
                    type="button"
                    onClick={() => void restoreClip(clip)}
                  >
                    {clip.type === "image" ? (
                      <div className="clip-image-preview grid grid-cols-[auto_1fr] items-center gap-3.5 max-[760px]:grid-cols-1">
                        <img alt="" className="h-[70px] w-[102px] shrink-0 rounded-lg border border-[var(--popup-border)] bg-[var(--popup-image-bg)] object-cover shadow-[inset_0_1px_rgba(255,255,255,0.18)] max-[760px]:w-[132px]" src={clip.imageDataUrl} />
                        <div className="min-w-0">
                          <h2 className="m-0 mb-2 truncate text-[15px] font-bold leading-tight text-[var(--popup-fg)]">{highlightSearchMatches(clipTitle(clip), query)}</h2>
                          {clip.pinned ? <span className="sr-only">Pinned</span> : null}
                          <p className="m-0 text-sm leading-snug text-[var(--popup-muted)]">{highlightSearchMatches(clip.width && clip.height ? `${clip.width.toLocaleString()} × ${clip.height.toLocaleString()}` : clip.preview, query)}<br />PNG Image</p>
                        </div>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <h2 className="m-0 mb-2 truncate text-[15px] font-bold leading-tight text-[var(--popup-fg)]">{highlightSearchMatches(clipTitle(clip), query)}</h2>
                        {clip.pinned ? <span className="sr-only">Pinned</span> : null}
                        <p className="m-0 line-clamp-2 max-w-[460px] text-sm leading-[1.45] text-[var(--popup-muted)]">{highlightSearchMatches(clip.preview, query)}</p>
                      </div>
                    )}
                  </button>
                  <div className="pt-7 text-right text-[13px] tabular-nums text-[var(--popup-muted)] max-[760px]:col-start-2 max-[760px]:pt-0 max-[760px]:text-left">{formatClipAge(clip.capturedAt)}</div>
                  <div className="max-[760px]:col-start-2">
                    <ClipActionButtons
                      item={clip}
                      variant="popup"
                      onDelete={() => void applyPopupHistoryAction("delete", clip)}
                      onPinToggle={() => void applyPopupHistoryAction(clip.pinned ? "unpin" : "pin", clip)}
                    />
                  </div>
                </article>
              );
            })}
            {clips.length === 0 ? (
              <div className="m-[17px] rounded-xl border border-dashed border-[var(--popup-border)] p-11 text-center text-sm text-[var(--popup-muted)]" role="status">
                {query ? "No clips match this search." : statusText === "Loading" ? "Loading history" : "Copy text, links, or images to start history"}
              </div>
            ) : null}
          </div>

          <footer className="grid h-16 shrink-0 grid-cols-[1fr_auto] items-center px-[21px] text-sm text-[var(--popup-muted)]">
            <span>{statusText}</span>
            <div className="flex items-center gap-[22px]">
              <button className={cx("grid h-6 w-6 place-items-center bg-transparent text-[var(--popup-muted)] transition hover:-translate-y-px hover:text-[var(--popup-fg)]", noDrag)} type="button" aria-label="Settings" onClick={() => void window.copclip?.openSettings()}>
                <GearSixIcon aria-hidden="true" size={16} />
              </button>
            </div>
          </footer>
      </section>
    </main>
  );
}
