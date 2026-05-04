export type ClipboardItemType = "text" | "link" | "image";

type ClipboardBaseItem = {
  id: string;
  type: ClipboardItemType;
  preview: string;
  capturedAt: string;
};

export type ClipboardTextItem = ClipboardBaseItem & {
  type: "text";
  text: string;
};

export type ClipboardLinkItem = ClipboardBaseItem & {
  type: "link";
  text: string;
  url: string;
};

export type ClipboardImageItem = ClipboardBaseItem & {
  type: "image";
  imageDataUrl: string;
  width: number;
  height: number;
};

export type ClipboardItem = ClipboardTextItem | ClipboardLinkItem | ClipboardImageItem;

export type ClipboardImagePayload = {
  imageDataUrl: string;
  width: number;
  height: number;
};

export type ClipboardHistory = {
  captureImage: (image: ClipboardImagePayload) => ClipboardImageItem | null;
  captureText: (text: string) => ClipboardTextItem | ClipboardLinkItem | null;
  clear: () => void;
  findById: (id: string) => ClipboardItem | undefined;
  list: (query?: string) => ClipboardItem[];
  close?: () => void;
  pinItem?: (id: string) => boolean;
  setHistoryLimit?: (limit: number) => void;
};

type ClipboardHistoryOptions = {
  now?: () => Date;
  createId?: () => string;
  previewLength?: number;
  historyLimit?: number;
};

const defaultPreviewLength = 140;
const defaultHistoryLimit = 100;

export function normalizeClipboardText(text: string): string | null {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeClipboardLink(text: string): string | null {
  const normalized = normalizeClipboardText(text);

  if (!normalized || /\s/.test(normalized)) {
    return null;
  }

  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function normalizeClipboardImage(image: ClipboardImagePayload): ClipboardImagePayload | null {
  if (
    !image.imageDataUrl.startsWith("data:image/png;base64,") ||
    !Number.isFinite(image.width) ||
    !Number.isFinite(image.height) ||
    image.width <= 0 ||
    image.height <= 0
  ) {
    return null;
  }

  return {
    imageDataUrl: image.imageDataUrl,
    width: Math.round(image.width),
    height: Math.round(image.height)
  };
}

export function previewText(text: string, maxLength = defaultPreviewLength): string {
  const singleLine = text.replace(/\s+/g, " ").trim();

  if (singleLine.length <= maxLength) {
    return singleLine;
  }

  return `${singleLine.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function previewImage(width: number, height: number): string {
  return `Image ${width}x${height}`;
}

export function clipboardItemSearchText(item: ClipboardItem): string {
  if (item.type === "image") {
    return item.preview;
  }

  return item.type === "link" ? `${item.text} ${item.url} ${item.preview}` : `${item.text} ${item.preview}`;
}

export function createClipboardHistory(options: ClipboardHistoryOptions = {}): ClipboardHistory {
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());
  const previewLength = options.previewLength ?? defaultPreviewLength;
  let historyLimit = Math.max(1, options.historyLimit ?? defaultHistoryLimit);
  const items: ClipboardItem[] = [];

  function pruneHistory(): void {
    items.splice(historyLimit);
  }

  function captureText(text: string): ClipboardTextItem | ClipboardLinkItem | null {
    const normalized = normalizeClipboardText(text);

    if (!normalized) {
      return null;
    }

    const url = normalizeClipboardLink(normalized);
    const type = url ? "link" : "text";
    const existingIndex = items.findIndex((item) =>
      type === "link" ? item.type === "link" && item.url === url : item.type === "text" && item.text === normalized
    );
    const capturedAt = now().toISOString();

    if (existingIndex >= 0) {
      const [existing] = items.splice(existingIndex, 1);
      const updated = {
        ...existing,
        preview: previewText(normalized, previewLength),
        capturedAt
      } as ClipboardTextItem | ClipboardLinkItem;

      items.unshift(updated);
      return updated;
    }

    const item: ClipboardTextItem | ClipboardLinkItem = url
      ? {
          id: createId(),
          type: "link",
          text: normalized,
          url,
          preview: previewText(normalized, previewLength),
          capturedAt
        }
      : {
          id: createId(),
          type: "text",
          text: normalized,
          preview: previewText(normalized, previewLength),
          capturedAt
        };

    items.unshift(item);
    pruneHistory();
    return item;
  }

  function captureImage(image: ClipboardImagePayload): ClipboardImageItem | null {
    const normalized = normalizeClipboardImage(image);

    if (!normalized) {
      return null;
    }

    const existingIndex = items.findIndex(
      (item) => item.type === "image" && item.imageDataUrl === normalized.imageDataUrl
    );
    const capturedAt = now().toISOString();
    const preview = previewImage(normalized.width, normalized.height);

    if (existingIndex >= 0) {
      const existing = items[existingIndex] as ClipboardImageItem;
      items.splice(existingIndex, 1);
      const updated: ClipboardImageItem = {
        ...existing,
        preview,
        capturedAt
      };

      items.unshift(updated);
      return updated;
    }

    const item: ClipboardImageItem = {
      id: createId(),
      type: "image",
      imageDataUrl: normalized.imageDataUrl,
      width: normalized.width,
      height: normalized.height,
      preview,
      capturedAt
    };

    items.unshift(item);
    pruneHistory();
    return item;
  }

  function list(query = ""): ClipboardItem[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return [...items];
    }

    return items.filter((item) => clipboardItemSearchText(item).toLocaleLowerCase().includes(normalizedQuery));
  }

  function findById(id: string): ClipboardItem | undefined {
    return items.find((item) => item.id === id);
  }

  function clear(): void {
    items.length = 0;
  }

  function setHistoryLimit(limit: number): void {
    historyLimit = Math.max(1, limit);
    pruneHistory();
  }

  return {
    captureImage,
    captureText,
    clear,
    findById,
    list,
    setHistoryLimit
  };
}
