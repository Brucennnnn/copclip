import { ClipboardTextIcon, CodeIcon, ImageIcon, LinkSimpleIcon, type Icon } from "@phosphor-icons/react";
import { clipboardItemSearchText, type ClipboardItem } from "../../../shared/clipboard-history";

export function formatClipAge(capturedAt: string): string {
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

export function clipTitle(item: ClipboardItem): string {
  return item.preview.length > 64 ? `${item.preview.slice(0, 61).trimEnd()}...` : item.preview;
}

export function clipKind(item: ClipboardItem): { label: string; Icon: Icon } {
  if (item.type === "image") {
    return { label: "IMG", Icon: ImageIcon };
  }

  if (item.type === "html") {
    return { label: "HTML", Icon: CodeIcon };
  }

  return item.type === "link" ? { label: "URL", Icon: LinkSimpleIcon } : { label: "TXT", Icon: ClipboardTextIcon };
}

export function filterClips(items: ClipboardItem[], query: string): ClipboardItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return normalizedQuery
    ? items.filter((item) => clipboardItemSearchText(item).toLocaleLowerCase().includes(normalizedQuery))
    : items;
}
