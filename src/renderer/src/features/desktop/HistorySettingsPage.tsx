import { BroomIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { ClipboardItem } from "../../../../shared/clipboard-history";
import { ClipActionButtons } from "../../components/ClipActionButtons";
import { ClipKindIcon } from "../../components/ClipKindIcon";
import { ClipPreview } from "../../components/ClipPreview";
import { PinBadge } from "../../components/PinBadge";
import { SettingsCard } from "../../components/SettingsCard";
import { clipTitle, formatClipAge } from "../../lib/clipboard-ui";
import { performHistoryAction, type HistoryAction } from "../../lib/history-actions";
import { cx, settingsBorder, settingsMuted } from "../../lib/styles";

export function HistorySettingsPage() {
  const [historyItems, setHistoryItems] = useState<ClipboardItem[]>([]);
  const [historyStatus, setHistoryStatus] = useState(Boolean(window.copclip) ? "Loading" : "Unavailable");

  const loadHistory = useCallback(async () => {
    if (!window.copclip) {
      setHistoryStatus("Unavailable");
      return;
    }

    const items = await window.copclip.listClipboardHistory("");
    setHistoryItems(items);
    setHistoryStatus(`${items.length} item${items.length === 1 ? "" : "s"}`);
  }, []);

  const applyHistoryAction = useCallback(async (action: HistoryAction, item?: ClipboardItem) => {
    const items = await performHistoryAction(action, item, historyItems);
    setHistoryItems(items);
    setHistoryStatus(`${items.length} item${items.length === 1 ? "" : "s"}`);
  }, [historyItems]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardHistoryChanged((items) => {
      setHistoryItems(items);
      setHistoryStatus(`${items.length} item${items.length === 1 ? "" : "s"}`);
    });
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-3.5">
        <p className={cx("mt-1 max-w-[680px] text-xs leading-snug max-[560px]:text-sm", settingsMuted)}>Pin reusable clips, delete individual entries, or clear local history when needed.</p>
        <button
          className="inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-lg border border-[#343838] bg-[#303333] px-2.5 text-xs font-semibold text-[#e8e8e8] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={historyItems.length === 0}
          type="button"
          onClick={() => void applyHistoryAction("clear")}
        >
          <BroomIcon aria-hidden="true" size={14} weight="bold" />
          Clear history
        </button>
      </div>

      <SettingsCard className="overflow-visible">
        {historyItems.map((item) => (
          <div className={cx("group grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3 border-b px-3.5 py-3.5 last:border-b-0", settingsBorder, item.pinned && "pinned")} key={item.id}>
            <ClipKindIcon item={item} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <strong className="truncate text-sm font-semibold text-[#e8e8e8]">{clipTitle(item)}</strong>
                <PinBadge pinned={item.pinned} />
              </div>
              <ClipPreview item={item} />
              <span className={cx("mt-2 block font-mono text-[11px]", settingsMuted)}>{formatClipAge(item.capturedAt)}</span>
            </div>
            <div className="[--border:#4a4f4f] [--fg:#e8e8e8] [--surface:#303333]">
              <ClipActionButtons
                item={item}
                onDelete={() => void applyHistoryAction("delete", item)}
                onPinToggle={() => void applyHistoryAction(item.pinned ? "unpin" : "pin", item)}
              />
            </div>
          </div>
        ))}
        {historyItems.length === 0 ? <div className={cx("grid min-h-40 place-items-center p-6 text-[13px]", settingsMuted)} role="status">{historyStatus === "Loading" ? "Loading history" : "No clipboard history yet"}</div> : null}
      </SettingsCard>
      <span className={cx("text-xs font-semibold", settingsMuted)} role="status">{historyStatus}</span>
    </>
  );
}
