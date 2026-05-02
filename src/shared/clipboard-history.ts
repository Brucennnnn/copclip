export type ClipboardTextItem = {
  id: string;
  type: "text";
  text: string;
  preview: string;
  capturedAt: string;
};

export type ClipboardHistory = {
  captureText: (text: string) => ClipboardTextItem | null;
  findById: (id: string) => ClipboardTextItem | undefined;
  list: (query?: string) => ClipboardTextItem[];
  close?: () => void;
  pinItem?: (id: string) => boolean;
};

type ClipboardHistoryOptions = {
  now?: () => Date;
  createId?: () => string;
  previewLength?: number;
};

const defaultPreviewLength = 140;

export function normalizeClipboardText(text: string): string | null {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

export function previewText(text: string, maxLength = defaultPreviewLength): string {
  const singleLine = text.replace(/\s+/g, " ").trim();

  if (singleLine.length <= maxLength) {
    return singleLine;
  }

  return `${singleLine.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function createClipboardHistory(options: ClipboardHistoryOptions = {}): ClipboardHistory {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());
  const previewLength = options.previewLength ?? defaultPreviewLength;
  const items: ClipboardTextItem[] = [];

  function captureText(text: string): ClipboardTextItem | null {
    const normalized = normalizeClipboardText(text);

    if (!normalized) {
      return null;
    }

    const existingIndex = items.findIndex((item) => item.text === normalized);
    const capturedAt = now().toISOString();

    if (existingIndex >= 0) {
      const [existing] = items.splice(existingIndex, 1);
      const updated = {
        ...existing,
        preview: previewText(normalized, previewLength),
        capturedAt
      };

      items.unshift(updated);
      return updated;
    }

    const item: ClipboardTextItem = {
      id: createId(),
      type: "text",
      text: normalized,
      preview: previewText(normalized, previewLength),
      capturedAt
    };

    items.unshift(item);
    return item;
  }

  function list(query = ""): ClipboardTextItem[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return [...items];
    }

    return items.filter((item) => item.text.toLocaleLowerCase().includes(normalizedQuery));
  }

  function findById(id: string): ClipboardTextItem | undefined {
    return items.find((item) => item.id === id);
  }

  return {
    captureText,
    findById,
    list
  };
}
