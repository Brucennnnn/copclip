import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteClipboardHistory } from "../src/main/sqlite-clipboard-history";
import type { ClipboardItem } from "../src/shared/clipboard-history";

const pngDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const tempDirs: string[] = [];

function createDatabasePath(): string {
  const dir = mkdtempSync(join(tmpdir(), "copclip-history-"));
  tempDirs.push(dir);
  return join(dir, "history.sqlite");
}

function itemLabels(items: ClipboardItem[]): string[] {
  return items.map((item) => (item.type === "image" ? item.preview : item.text));
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop() as string, { force: true, recursive: true });
  }
});

describe("sqlite clipboard text history", () => {
  it("creates the database schema and migration version", () => {
    const databasePath = createDatabasePath();
    const history = createSqliteClipboardHistory(databasePath);
    history.close?.();

    const database = new Database(databasePath);
    expect(database.pragma("user_version", { simple: true })).toBe(2);
    expect(
      database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'clipboard_items'").get()
    ).toEqual({ name: "clipboard_items" });
    database.close();
  });

  it("persists captured text across repository instances", () => {
    const databasePath = createDatabasePath();
    const firstHistory = createSqliteClipboardHistory(databasePath, {
      createId: () => "clip-1",
      now: () => new Date(Date.UTC(2026, 4, 1, 12))
    });

    firstHistory.captureText("persisted text");
    firstHistory.close?.();

    const secondHistory = createSqliteClipboardHistory(databasePath);
    expect(itemLabels(secondHistory.list())).toEqual(["persisted text"]);
    secondHistory.close?.();
  });

  it("persists copied links as typed URL entries", () => {
    const databasePath = createDatabasePath();
    const firstHistory = createSqliteClipboardHistory(databasePath, {
      createId: () => "clip-link",
      now: () => new Date(Date.UTC(2026, 4, 1, 12))
    });

    firstHistory.captureText("https://example.com/docs");
    firstHistory.close?.();

    const secondHistory = createSqliteClipboardHistory(databasePath);
    expect(secondHistory.list()[0]).toMatchObject({
      id: "clip-link",
      type: "link",
      text: "https://example.com/docs",
      url: "https://example.com/docs"
    });
    secondHistory.close?.();
  });

  it("persists copied images as PNG history entries", () => {
    const databasePath = createDatabasePath();
    const firstHistory = createSqliteClipboardHistory(databasePath, {
      createId: () => "clip-image",
      now: () => new Date(Date.UTC(2026, 4, 1, 12))
    });

    firstHistory.captureImage({ imageDataUrl: pngDataUrl, width: 1, height: 1 });
    firstHistory.close?.();

    const secondHistory = createSqliteClipboardHistory(databasePath);
    expect(secondHistory.list()[0]).toMatchObject({
      id: "clip-image",
      type: "image",
      preview: "Image 1x1",
      imageDataUrl: pngDataUrl,
      width: 1,
      height: 1
    });
    secondHistory.close?.();
  });

  it("migrates existing text history to the typed schema", () => {
    const databasePath = createDatabasePath();
    const database = new Database(databasePath);
    database.exec(`
      CREATE TABLE clipboard_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type = 'text'),
        text TEXT NOT NULL UNIQUE,
        preview TEXT NOT NULL,
        captured_at TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1))
      );

      INSERT INTO clipboard_items (id, type, text, preview, captured_at, pinned)
      VALUES ('legacy-link', 'text', 'https://example.com/docs', 'https://example.com/docs', '2026-05-01T12:00:00.000Z', 0);

      PRAGMA user_version = 1;
    `);
    database.close();

    const history = createSqliteClipboardHistory(databasePath);

    expect(history.list()[0]).toMatchObject({
      id: "legacy-link",
      type: "link",
      text: "https://example.com/docs",
      url: "https://example.com/docs"
    });
    history.close?.();

    const migratedDatabase = new Database(databasePath);
    expect(migratedDatabase.pragma("user_version", { simple: true })).toBe(2);
    migratedDatabase.close();
  });

  it("keeps list order by most recent capture", () => {
    let second = 0;
    const history = createSqliteClipboardHistory(createDatabasePath(), {
      createId: () => `clip-${second}`,
      now: () => new Date(Date.UTC(2026, 4, 1, 12, 0, second++))
    });

    history.captureText("first");
    history.captureText("second");

    expect(itemLabels(history.list())).toEqual(["second", "first"]);
    history.close?.();
  });

  it("deduplicates repeated text by updating the existing row", () => {
    let second = 0;
    const history = createSqliteClipboardHistory(createDatabasePath(), {
      createId: () => `clip-${second}`,
      now: () => new Date(Date.UTC(2026, 4, 1, 12, 0, second++))
    });

    const first = history.captureText("alpha");
    history.captureText("beta");
    const repeated = history.captureText("alpha");

    expect(itemLabels(history.list())).toEqual(["alpha", "beta"]);
    expect(repeated?.id).toBe(first?.id);
    history.close?.();
  });

  it("filters text case-insensitively", () => {
    const history = createSqliteClipboardHistory(createDatabasePath());

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.captureText("Clipboard manager");

    expect(itemLabels(history.list("git"))).toEqual(["GitHub issue"]);
    expect(itemLabels(history.list("CLIP"))).toEqual(["Clipboard manager"]);
    history.close?.();
  });

  it("clears all stored history", () => {
    const history = createSqliteClipboardHistory(createDatabasePath());

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.clear();

    expect(history.list()).toEqual([]);
    history.close?.();
  });

  it("prunes existing stored history when the limit changes", () => {
    let second = 0;
    const history = createSqliteClipboardHistory(createDatabasePath(), {
      historyLimit: 5,
      now: () => new Date(Date.UTC(2026, 4, 1, 12, 0, second++))
    });

    history.captureText("First");
    history.captureText("Second");
    history.captureText("Third");
    history.setHistoryLimit?.(2);

    expect(itemLabels(history.list())).toEqual(["Third", "Second"]);
    history.close?.();
  });

  it("prunes old unpinned items while preserving pinned items", () => {
    let second = 0;
    const history = createSqliteClipboardHistory(createDatabasePath(), {
      createId: () => `clip-${second}`,
      historyLimit: 2,
      now: () => new Date(Date.UTC(2026, 4, 1, 12, 0, second++))
    });

    const pinned = history.captureText("alpha");
    history.captureText("beta");
    history.captureText("gamma");
    expect(itemLabels(history.list())).toEqual(["gamma", "beta"]);

    expect(history.pinItem?.(pinned?.id ?? "")).toBe(false);

    const pinnedAgain = history.captureText("alpha");
    expect(history.pinItem?.(pinnedAgain?.id ?? "")).toBe(true);
    history.captureText("delta");

    expect(itemLabels(history.list())).toEqual(["alpha", "delta", "gamma"]);
    history.close?.();
  });
});
