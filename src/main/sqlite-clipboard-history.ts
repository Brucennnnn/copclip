import { createHash } from "node:crypto";
import Database from "better-sqlite3";
import {
  normalizeClipboardImage,
  normalizeClipboardLink,
  normalizeClipboardText,
  previewImage,
  previewText,
  type ClipboardHistory,
  type ClipboardImageItem,
  type ClipboardImagePayload,
  type ClipboardItem,
  type ClipboardItemType,
  type ClipboardLinkItem,
  type ClipboardTextItem
} from "../shared/clipboard-history";

type SqliteClipboardHistoryOptions = {
  now?: () => Date;
  createId?: () => string;
  previewLength?: number;
  historyLimit?: number;
};

type ClipboardRow = {
  id: string;
  type: ClipboardItemType;
  text: string | null;
  url: string | null;
  preview: string;
  image_data: Buffer | null;
  image_width: number | null;
  image_height: number | null;
  content_key: string;
  captured_at: string;
  pinned: 0 | 1;
};

type LegacyClipboardRow = {
  id: string;
  text: string;
  preview: string;
  captured_at: string;
  pinned: 0 | 1;
};

const schemaVersion = 2;
const defaultPreviewLength = 140;
const defaultHistoryLimit = 100;
const pngDataUrlPrefix = "data:image/png;base64,";

const createSchemaSql = `
  CREATE TABLE IF NOT EXISTS clipboard_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('text', 'link', 'image')),
    text TEXT,
    url TEXT,
    preview TEXT NOT NULL,
    image_data BLOB,
    image_width INTEGER,
    image_height INTEGER,
    content_key TEXT NOT NULL UNIQUE,
    captured_at TEXT NOT NULL,
    pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
    CHECK (
      (type = 'text' AND text IS NOT NULL AND url IS NULL AND image_data IS NULL AND image_width IS NULL AND image_height IS NULL) OR
      (type = 'link' AND text IS NOT NULL AND url IS NOT NULL AND image_data IS NULL AND image_width IS NULL AND image_height IS NULL) OR
      (type = 'image' AND text IS NULL AND url IS NULL AND image_data IS NOT NULL AND image_width IS NOT NULL AND image_height IS NOT NULL)
    )
  );

  CREATE INDEX IF NOT EXISTS clipboard_items_order_idx
    ON clipboard_items (pinned DESC, captured_at DESC);
`;

function hashBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

function textContentKey(type: "text" | "link", text: string, url: string | null): string {
  return type === "link" && url ? `link:${url}` : `text:${text}`;
}

function imageContentKey(buffer: Buffer): string {
  return `image:${hashBuffer(buffer)}`;
}

function imageDataUrlToBuffer(imageDataUrl: string): Buffer | null {
  if (!imageDataUrl.startsWith(pngDataUrlPrefix)) {
    return null;
  }

  return Buffer.from(imageDataUrl.slice(pngDataUrlPrefix.length), "base64");
}

function toImageDataUrl(buffer: Buffer): string {
  return `${pngDataUrlPrefix}${buffer.toString("base64")}`;
}

function toClipboardItem(row: ClipboardRow): ClipboardItem {
  if (row.type === "image") {
    return {
      id: row.id,
      type: "image",
      preview: row.preview,
      imageDataUrl: toImageDataUrl(row.image_data ?? Buffer.alloc(0)),
      width: row.image_width ?? 0,
      height: row.image_height ?? 0,
      capturedAt: row.captured_at,
      pinned: row.pinned === 1
    };
  }

  if (row.type === "link") {
    return {
      id: row.id,
      type: "link",
      text: row.text ?? "",
      url: row.url ?? row.text ?? "",
      preview: row.preview,
      capturedAt: row.captured_at,
      pinned: row.pinned === 1
    };
  }

  return {
    id: row.id,
    type: "text",
    text: row.text ?? "",
    preview: row.preview,
    capturedAt: row.captured_at,
    pinned: row.pinned === 1
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\%_]/g, (match) => `\${match}`);
}

function hasClipboardItemsTable(database: Database.Database): boolean {
  return Boolean(database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'clipboard_items'").get());
}

function legacyRowToInsertParams(row: LegacyClipboardRow, previewLength: number) {
  const normalized = normalizeClipboardText(row.text);

  if (!normalized) {
    return null;
  }

  const url = normalizeClipboardLink(normalized);
  const type = url ? "link" : "text";

  return {
    id: row.id,
    type,
    text: normalized,
    url,
    preview: previewText(normalized, previewLength),
    imageData: null,
    imageWidth: null,
    imageHeight: null,
    contentKey: textContentKey(type, normalized, url),
    capturedAt: row.captured_at,
    pinned: row.pinned
  };
}

function ensureSchema(database: Database.Database, previewLength: number): void {
  const currentVersion = Number(database.pragma("user_version", { simple: true }) ?? 0);

  if (!hasClipboardItemsTable(database)) {
    database.exec(createSchemaSql);
    database.pragma(`user_version = ${schemaVersion}`);
    return;
  }

  if (currentVersion >= schemaVersion) {
    database.exec(createSchemaSql);
    database.pragma(`user_version = ${schemaVersion}`);
    return;
  }

  const legacyRows = database.prepare("SELECT id, text, preview, captured_at, pinned FROM clipboard_items").all() as LegacyClipboardRow[];
  const migrate = database.transaction(() => {
    database.exec(`
      DROP TABLE IF EXISTS clipboard_items_legacy;
      ALTER TABLE clipboard_items RENAME TO clipboard_items_legacy;
    `);
    database.exec(createSchemaSql);

    const insertMigratedStatement = database.prepare(`
      INSERT OR IGNORE INTO clipboard_items (
        id,
        type,
        text,
        url,
        preview,
        image_data,
        image_width,
        image_height,
        content_key,
        captured_at,
        pinned
      )
      VALUES (
        @id,
        @type,
        @text,
        @url,
        @preview,
        @imageData,
        @imageWidth,
        @imageHeight,
        @contentKey,
        @capturedAt,
        @pinned
      )
    `);

    for (const row of legacyRows) {
      const params = legacyRowToInsertParams(row, previewLength);

      if (params) {
        insertMigratedStatement.run(params);
      }
    }

    database.exec("DROP TABLE clipboard_items_legacy");
    database.pragma(`user_version = ${schemaVersion}`);
  });

  migrate();
}

export function createSqliteClipboardHistory(
  databasePath: string,
  options: SqliteClipboardHistoryOptions = {}
): ClipboardHistory {
  const database = new Database(databasePath);
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());
  const previewLength = options.previewLength ?? defaultPreviewLength;
  let historyLimit = Math.max(1, options.historyLimit ?? defaultHistoryLimit);

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  ensureSchema(database, previewLength);

  const findByContentKeyStatement = database.prepare("SELECT * FROM clipboard_items WHERE content_key = ?");
  const findByIdStatement = database.prepare("SELECT * FROM clipboard_items WHERE id = ?");
  const insertStatement = database.prepare(`
    INSERT INTO clipboard_items (
      id,
      type,
      text,
      url,
      preview,
      image_data,
      image_width,
      image_height,
      content_key,
      captured_at
    )
    VALUES (
      @id,
      @type,
      @text,
      @url,
      @preview,
      @imageData,
      @imageWidth,
      @imageHeight,
      @contentKey,
      @capturedAt
    )
  `);
  const updateExistingStatement = database.prepare(`
    UPDATE clipboard_items
    SET text = @text,
        url = @url,
        preview = @preview,
        image_data = @imageData,
        image_width = @imageWidth,
        image_height = @imageHeight,
        captured_at = @capturedAt
    WHERE id = @id
  `);
  const listStatement = database.prepare(`
    SELECT * FROM clipboard_items
    ORDER BY pinned DESC, captured_at DESC
  `);
  const searchStatement = database.prepare(`
    SELECT * FROM clipboard_items
    WHERE lower(coalesce(text, '') || ' ' || coalesce(url, '') || ' ' || preview) LIKE @query ESCAPE '\\'
    ORDER BY pinned DESC, captured_at DESC
  `);
  const deleteStatement = database.prepare("DELETE FROM clipboard_items WHERE id = ?");
  const pinStatement = database.prepare("UPDATE clipboard_items SET pinned = 1 WHERE id = ?");
  const unpinStatement = database.prepare("UPDATE clipboard_items SET pinned = 0 WHERE id = ?");
  const clearStatement = database.prepare("DELETE FROM clipboard_items");
  const pruneStatement = database.prepare(`
    DELETE FROM clipboard_items
    WHERE id IN (
      SELECT id
      FROM clipboard_items
      WHERE pinned = 0
      ORDER BY captured_at DESC
      LIMIT -1 OFFSET @historyLimit
    )
  `);

  function pruneHistory(): void {
    pruneStatement.run({ historyLimit });
  }

  function findById(id: string): ClipboardItem | undefined {
    const row = findByIdStatement.get(id) as ClipboardRow | undefined;
    return row ? toClipboardItem(row) : undefined;
  }

  function captureText(text: string): ClipboardTextItem | ClipboardLinkItem | null {
    const normalized = normalizeClipboardText(text);

    if (!normalized) {
      return null;
    }

    const url = normalizeClipboardLink(normalized);
    const type = url ? "link" : "text";
    const capturedAt = now().toISOString();
    const preview = previewText(normalized, previewLength);
    const contentKey = textContentKey(type, normalized, url);
    const existing = findByContentKeyStatement.get(contentKey) as ClipboardRow | undefined;

    if (existing) {
      updateExistingStatement.run({
        id: existing.id,
        text: normalized,
        url,
        preview,
        imageData: null,
        imageWidth: null,
        imageHeight: null,
        capturedAt
      });
      pruneHistory();
      return findById(existing.id) as ClipboardTextItem | ClipboardLinkItem | null;
    }

    const id = createId();
    insertStatement.run({
      id,
      type,
      text: normalized,
      url,
      preview,
      imageData: null,
      imageWidth: null,
      imageHeight: null,
      contentKey,
      capturedAt
    });
    pruneHistory();
    return findById(id) as ClipboardTextItem | ClipboardLinkItem | null;
  }

  function captureImage(image: ClipboardImagePayload): ClipboardImageItem | null {
    const normalized = normalizeClipboardImage(image);

    if (!normalized) {
      return null;
    }

    const imageData = imageDataUrlToBuffer(normalized.imageDataUrl);

    if (!imageData) {
      return null;
    }

    const capturedAt = now().toISOString();
    const preview = previewImage(normalized.width, normalized.height);
    const contentKey = imageContentKey(imageData);
    const existing = findByContentKeyStatement.get(contentKey) as ClipboardRow | undefined;

    if (existing) {
      updateExistingStatement.run({
        id: existing.id,
        text: null,
        url: null,
        preview,
        imageData,
        imageWidth: normalized.width,
        imageHeight: normalized.height,
        capturedAt
      });
      pruneHistory();
      return findById(existing.id) as ClipboardImageItem | null;
    }

    const id = createId();
    insertStatement.run({
      id,
      type: "image",
      text: null,
      url: null,
      preview,
      imageData,
      imageWidth: normalized.width,
      imageHeight: normalized.height,
      contentKey,
      capturedAt
    });
    pruneHistory();
    return findById(id) as ClipboardImageItem | null;
  }

  function list(query = ""): ClipboardItem[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const rows = normalizedQuery
      ? searchStatement.all({ query: `%${escapeLikePattern(normalizedQuery)}%` })
      : listStatement.all();

    return (rows as ClipboardRow[]).map(toClipboardItem);
  }

  function pinItem(id: string): boolean {
    const result = pinStatement.run(id);
    return result.changes > 0;
  }

  function unpinItem(id: string): boolean {
    const result = unpinStatement.run(id);
    pruneHistory();
    return result.changes > 0;
  }

  function deleteItem(id: string): boolean {
    const result = deleteStatement.run(id);
    return result.changes > 0;
  }

  function clear(): void {
    clearStatement.run();
  }

  function setHistoryLimit(limit: number): void {
    historyLimit = Math.max(1, limit);
    pruneHistory();
  }

  return {
    captureImage,
    captureText,
    clear,
    close: () => database.close(),
    deleteItem,
    findById,
    list,
    pinItem,
    setHistoryLimit,
    unpinItem
  };
}
