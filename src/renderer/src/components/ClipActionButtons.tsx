import { PushPinIcon, PushPinSlashIcon, TrashIcon } from "@phosphor-icons/react";
import type { ClipboardItem } from "../../../shared/clipboard-history";
import { cx, noDrag } from "../lib/styles";

export function ClipActionButtons({ item, onDelete, onPinToggle, variant = "default" }: { item: ClipboardItem; onDelete: () => void; onPinToggle: () => void; variant?: "default" | "popup" }) {
  const PinIcon = item.pinned ? PushPinSlashIcon : PushPinIcon;
  const popupButtonClass = "inline-flex h-[31px] items-center gap-1.5 rounded-lg border border-[var(--popup-soft-border)] bg-[var(--popup-control)] px-[9px] text-[13px] font-semibold text-[var(--popup-fg)] transition-colors hover:bg-[var(--popup-control-hover)]";

  return (
    <div className={variant === "popup" ? "flex items-center gap-[7px]" : "flex items-center gap-1.5"} aria-label={`Actions for ${item.preview}`}>
      <button
        aria-label={`${item.pinned ? "Unpin" : "Pin"} clipboard item: ${item.preview}`}
        className={cx(
          variant === "popup"
            ? cx(popupButtonClass, item.pinned && "border-[color-mix(in_oklch,var(--accent)_45%,var(--popup-border))] bg-[color-mix(in_oklch,var(--accent-soft)_70%,transparent)] text-[var(--accent)]")
            : "inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:border-[color-mix(in_oklch,var(--accent)_45%,var(--border))]",
          noDrag
        )}
        type="button"
        onClick={onPinToggle}
      >
        <PinIcon aria-hidden="true" size={13} weight="bold" />
        {item.pinned ? "Unpin" : "Pin"}
      </button>
      <button
        aria-label={`Delete clipboard item: ${item.preview}`}
        className={cx(
          variant === "popup"
            ? popupButtonClass
            : "inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:border-red-500",
          noDrag
        )}
        type="button"
        onClick={onDelete}
      >
        <TrashIcon aria-hidden="true" size={13} weight="bold" />
        Delete
      </button>
    </div>
  );
}
