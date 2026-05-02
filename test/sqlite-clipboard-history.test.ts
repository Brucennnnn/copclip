import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { createSqliteClipboardHistory } from "../src/main/sqlite-clipboard-history";

const tempDirs: string[] = [];

function createDatabasePath(): string {
  const dir = mkdtempSync(join(tmpdir(), "copclip-history-"));
  tempDirs.push(dir);
  return join(dir, "history.sqlite");
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
    expect(database.pragma("user_version", { simple: true })).toBe(1);
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
    expect(secondHistory.list().map((item) => item.text)).toEqual(["persisted text"]);
    secondHistory.close?.();
  });

  it("keeps list order by most recent capture", () => {
    let second = 0;
    const history = createSqliteClipboardHistory(createDatabasePath(), {
      createId: () => `clip-${second}`,
      now: () => new Date(Date.UTC(2026, 4, 1, 12, 0, second++))
    });

    history.captureText("first");
    history.captureText("second");

    expect(history.list().map((item) => item.text)).toEqual(["second", "first"]);
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

    expect(history.list().map((item) => item.text)).toEqual(["alpha", "beta"]);
    expect(repeated?.id).toBe(first?.id);
    history.close?.();
  });

  it("filters text case-insensitively", () => {
    const history = createSqliteClipboardHistory(createDatabasePath());

    history.captureText("Release checklist");
    history.captureText("GitHub issue");
    history.captureText("Clipboard manager");

    expect(history.list("git").map((item) => item.text)).toEqual(["GitHub issue"]);
    expect(history.list("CLIP").map((item) => item.text)).toEqual(["Clipboard manager"]);
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
    expect(history.list().map((item) => item.text)).toEqual(["gamma", "beta"]);

    expect(history.pinItem?.(pinned?.id ?? "")).toBe(false);

    const pinnedAgain = history.captureText("alpha");
    expect(history.pinItem?.(pinnedAgain?.id ?? "")).toBe(true);
    history.captureText("delta");

    expect(history.list().map((item) => item.text)).toEqual(["alpha", "delta", "gamma"]);
    history.close?.();
  });
});
