import Database from "better-sqlite3";
import {
  normalizeClipboardText,
  previewText,
  type ClipboardHistory,
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
  type: "text";
  text: string;
  preview: string;
  captured_at: string;
  pinned: 0 | 1;
};

const schemaVersion = 1;
const defaultPreviewLength = 140;
const defaultHistoryLimit = 100;

function toClipboardTextItem(row: ClipboardRow): ClipboardTextItem {
  return {
    id: row.id,
    type: row.type,
    text: row.text,
    preview: row.preview,
    capturedAt: row.captured_at
  };
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export function createSqliteClipboardHistory(
  databasePath: string,
  options: SqliteClipboardHistoryOptions = {}
): ClipboardHistory {
  const database = new Database(databasePath);
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? (() => crypto.randomUUID());
  const previewLength = options.previewLength ?? defaultPreviewLength;
  const historyLimit = Math.max(1, options.historyLimit ?? defaultHistoryLimit);

  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS clipboard_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK (type = 'text'),
      text TEXT NOT NULL UNIQUE,
      preview TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
    );

    CREATE INDEX IF NOT EXISTS clipboard_items_order_idx
      ON clipboard_items (pinned DESC, captured_at DESC);
  `);
  database.pragma(`user_version = ${schemaVersion}`);

  const findByTextStatement = database.prepare("SELECT * FROM clipboard_items WHERE text = ?");
  const findByIdStatement = database.prepare("SELECT * FROM clipboard_items WHERE id = ?");
  const insertStatement = database.prepare(`
    INSERT INTO clipboard_items (id, type, text, preview, captured_at)
    VALUES (@id, 'text', @text, @preview, @capturedAt)
  `);
  const updateExistingStatement = database.prepare(`
    UPDATE clipboard_items
    SET preview = @preview,
        captured_at = @capturedAt
    WHERE id = @id
  `);
  const listStatement = database.prepare(`
    SELECT * FROM clipboard_items
    ORDER BY pinned DESC, captured_at DESC
  `);
  const searchStatement = database.prepare(`
    SELECT * FROM clipboard_items
    WHERE lower(text) LIKE @query ESCAPE '\\'
    ORDER BY pinned DESC, captured_at DESC
  `);
  const pinStatement = database.prepare("UPDATE clipboard_items SET pinned = 1 WHERE id = ?");
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

  function captureText(text: string): ClipboardTextItem | null {
    const normalized = normalizeClipboardText(text);

    if (!normalized) {
      return null;
    }

    const capturedAt = now().toISOString();
    const preview = previewText(normalized, previewLength);
    const existing = findByTextStatement.get(normalized) as ClipboardRow | undefined;

    if (existing) {
      updateExistingStatement.run({
        id: existing.id,
        preview,
        capturedAt
      });
      pruneHistory();
      return findById(existing.id) ?? null;
    }

    const id = createId();
    insertStatement.run({
      id,
      text: normalized,
      preview,
      capturedAt
    });
    pruneHistory();
    return findById(id) ?? null;
  }

  function list(query = ""): ClipboardTextItem[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const rows = normalizedQuery
      ? searchStatement.all({ query: `%${escapeLikePattern(normalizedQuery)}%` })
      : listStatement.all();

    return (rows as ClipboardRow[]).map(toClipboardTextItem);
  }

  function findById(id: string): ClipboardTextItem | undefined {
    const row = findByIdStatement.get(id) as ClipboardRow | undefined;
    return row ? toClipboardTextItem(row) : undefined;
  }

  function pinItem(id: string): boolean {
    const result = pinStatement.run(id);
    return result.changes > 0;
  }

  return {
    captureText,
    close: () => database.close(),
    findById,
    list,
    pinItem
  };
}
