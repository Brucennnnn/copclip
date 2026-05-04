import { describe, expect, it } from "vitest";
import { openPopupFlag, requestedStartupSurface } from "../src/main/app-command";

describe("app command line routing", () => {
  it("opens the desktop shell by default", () => {
    expect(requestedStartupSurface(["electron", "."])).toBe("desktop");
  });

  it("opens the clipboard popup when requested by a second app invocation", () => {
    expect(requestedStartupSurface(["electron", ".", openPopupFlag])).toBe("popup");
  });
});
