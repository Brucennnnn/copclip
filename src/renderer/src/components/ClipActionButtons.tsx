import { PushPinIcon, PushPinSlashIcon, TrashIcon } from "@phosphor-icons/react";
import type { ClipboardItem } from "../../../shared/clipboard-history";
import { cx, noDrag } from "../lib/styles";

export function ClipActionButtons({ item, onDelete, onPinToggle }: { item: ClipboardItem; onDelete: () => void; onPinToggle: () => void }) {
  const PinIcon = item.pinned ? PushPinSlashIcon : PushPinIcon;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Actions for ${item.preview}`}>
      <button
        aria-label={`${item.pinned ? "Unpin" : "Pin"} clipboard item: ${item.preview}`}
        className={cx("inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:border-[color-mix(in_oklch,var(--accent)_45%,var(--border))]", noDrag)}
        type="button"
        onClick={onPinToggle}
      >
        <PinIcon aria-hidden="true" size={13} weight="bold" />
        {item.pinned ? "Unpin" : "Pin"}
      </button>
      <button
        aria-label={`Delete clipboard item: ${item.preview}`}
        className={cx("inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:border-red-500", noDrag)}
        type="button"
        onClick={onDelete}
      >
        <TrashIcon aria-hidden="true" size={13} weight="bold" />
        Delete
      </button>
    </div>
  );
}
