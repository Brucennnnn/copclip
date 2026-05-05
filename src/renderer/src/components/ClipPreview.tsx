import type { ClipboardItem } from "../../../shared/clipboard-history";

export function ClipPreview({ item }: { item: ClipboardItem }) {
  if (item.type === "image") {
    return (
      <div className="clip-image-preview mt-2 flex min-w-0 items-center gap-2.5">
        <img alt="" className="h-12 w-[72px] shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] object-cover" src={item.imageDataUrl} />
        <p className="m-0 line-clamp-2 overflow-hidden text-[13px] leading-snug text-[var(--muted)]">{item.preview}</p>
      </div>
    );
  }

  return <p className="mt-1.5 line-clamp-2 overflow-hidden text-[13px] leading-snug text-[var(--muted)]">{item.preview}</p>;
}
