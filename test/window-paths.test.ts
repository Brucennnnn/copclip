import { describe, expect, it } from "vitest";
import { preloadScriptPath } from "../src/main/window-paths";

describe("main window paths", () => {
  it("points BrowserWindow at the electron-vite preload output", () => {
    expect(preloadScriptPath("/app/out/main")).toBe("/app/out/preload/index.mjs");
  });
});
