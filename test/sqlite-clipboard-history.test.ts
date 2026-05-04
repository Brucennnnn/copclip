import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteClipboardHistory } from "../src/main/sqlite-clipboard-history";
import { maxClipboardImagePixels, type ClipboardItem } from "../src/shared/clipboard-history";

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
    expect(database.pragma("user_version", { simple: true })).toBe(3);
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

  it("persists copied HTML with plain text preview metadata", () => {
    const databasePath = createDatabasePath();
    const firstHistory = createSqliteClipboardHistory(databasePath, {
      createId: () => "clip-html",
      now: () => new Date(Date.UTC(2026, 4, 1, 12))
    });

    firstHistory.captureHtml({ html: "<p><strong>Release</strong> checklist</p>", text: "Release checklist" });
    firstHistory.close?.();

    const secondHistory = createSqliteClipboardHistory(databasePath);
    expect(secondHistory.list()[0]).toMatchObject({
      id: "clip-html",
      type: "html",
      text: "Release checklist",
      html: "<p><strong>Release</strong> checklist</p>",
      preview: "Release checklist"
    });
    expect(itemLabels(secondHistory.list("strong"))).toEqual(["Release checklist"]);
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

  it("rejects oversized copied images before persistence", () => {
    const databasePath = createDatabasePath();
    const history = createSqliteClipboardHistory(databasePath);

    expect(history.captureImage({ imageDataUrl: pngDataUrl, width: maxClipboardImagePixels + 1, height: 1 })).toBeNull();
    expect(history.list()).toEqual([]);
    history.close?.();
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
    expect(migratedDatabase.pragma("user_version", { simple: true })).toBe(3);
    migratedDatabase.close();
  });

  it("migrates existing typed history to the HTML-capable schema", () => {
    const databasePath = createDatabasePath();
    const database = new Database(databasePath);
    database.exec(`
      CREATE TABLE clipboard_items (
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

      INSERT INTO clipboard_items (id, type, text, url, preview, image_data, image_width, image_height, content_key, captured_at, pinned)
      VALUES ('typed-link', 'link', 'https://example.com/docs', 'https://example.com/docs', 'https://example.com/docs', NULL, NULL, NULL, 'link:https://example.com/docs', '2026-05-01T12:00:00.000Z', 1);

      PRAGMA user_version = 2;
    `);
    database.close();

    const history = createSqliteClipboardHistory(databasePath);

    expect(history.list()[0]).toMatchObject({
      id: "typed-link",
      type: "link",
      pinned: true,
      text: "https://example.com/docs"
    });
    history.close?.();

    const migratedDatabase = new Database(databasePath);
    expect(migratedDatabase.pragma("user_version", { simple: true })).toBe(3);
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

  it("pins, unpins, and deletes stored history items", () => {
    let second = 0;
    const history = createSqliteClipboardHistory(createDatabasePath(), {
      createId: () => `clip-${second}`,
      now: () => new Date(Date.UTC(2026, 4, 1, 12, 0, second++))
    });

    const alpha = history.captureText("alpha");
    const beta = history.captureText("beta");

    expect(history.pinItem?.(alpha?.id ?? "")).toBe(true);
    expect(history.list()[0]).toMatchObject({ text: "alpha", pinned: true });

    expect(history.unpinItem?.(alpha?.id ?? "")).toBe(true);
    expect(itemLabels(history.list())).toEqual(["beta", "alpha"]);

    expect(history.deleteItem?.(beta?.id ?? "")).toBe(true);
    expect(history.deleteItem?.("missing")).toBe(false);
    expect(itemLabels(history.list())).toEqual(["alpha"]);
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
