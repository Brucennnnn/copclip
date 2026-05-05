import type { ClipboardItem } from "../../../shared/clipboard-history";
import { clipKind } from "../lib/clipboard-ui";

export function ClipKindIcon({ item }: { item: ClipboardItem }) {
  const { Icon, label } = clipKind(item);

  return (
    <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] group-[.pinned]:border-[color-mix(in_oklch,var(--accent)_35%,var(--border))] group-[.pinned]:text-[var(--accent)]">
      <Icon aria-hidden="true" size={15} weight="duotone" />
      <span className="font-mono text-[8px] font-semibold leading-none">{label}</span>
    </div>
  );
}
