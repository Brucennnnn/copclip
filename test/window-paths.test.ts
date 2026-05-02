import { describe, expect, it } from "vitest";
import { preloadScriptPath, rendererDevUrl } from "../src/main/window-paths";

describe("main window paths", () => {
  it("points BrowserWindow at the electron-vite preload output", () => {
    expect(preloadScriptPath("/app/out/main")).toBe("/app/out/preload/index.mjs");
  });

  it("loads distinct renderer surfaces in development", () => {
    expect(rendererDevUrl("http://localhost:5173/", "desktop")).toBe("http://localhost:5173/?surface=desktop");
    expect(rendererDevUrl("http://localhost:5173/?debug=1", "popup")).toBe("http://localhost:5173/?debug=1&surface=popup");
  });
});
