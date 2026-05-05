export function PinBadge({ pinned }: { pinned: boolean }) {
  return pinned ? <span className="shrink-0 rounded-full border border-[color-mix(in_oklch,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklch,var(--accent-soft)_72%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">Pinned</span> : null;
}
