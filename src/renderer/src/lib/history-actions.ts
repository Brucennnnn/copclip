import type { ClipboardItem } from "../../../shared/clipboard-history";

export type HistoryAction = "clear" | "delete" | "pin" | "unpin";

export async function performHistoryAction(action: HistoryAction, item: ClipboardItem | undefined, fallbackItems: ClipboardItem[]): Promise<ClipboardItem[]> {
  if (!window.copclip) {
    return fallbackItems;
  }

  if (action === "clear") {
    return window.copclip.clearClipboardHistory();
  }

  if (!item) {
    return fallbackItems;
  }

  if (action === "delete") {
    return window.copclip.deleteClipboardItem(item.id);
  }

  return action === "unpin" ? window.copclip.unpinClipboardItem(item.id) : window.copclip.pinClipboardItem(item.id);
}
