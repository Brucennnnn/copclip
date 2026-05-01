import { describe, expect, it } from "vitest";
import { positionPopupNearCursor } from "../src/shared/popup-position";

const popupSize = { width: 720, height: 520 };

describe("popup positioning", () => {
  it("opens centered under the cursor when there is room", () => {
    expect(
      positionPopupNearCursor(
        { x: 800, y: 300 },
        { x: 0, y: 0, width: 1600, height: 1000 },
        popupSize
      )
    ).toEqual({ x: 440, y: 314 });
  });

  it("keeps the popup fully visible near the left and top edges", () => {
    expect(
      positionPopupNearCursor(
        { x: 20, y: 10 },
        { x: 0, y: 0, width: 1600, height: 1000 },
        popupSize
      )
    ).toEqual({ x: 0, y: 24 });
  });

  it("keeps the popup fully visible near the right edge", () => {
    expect(
      positionPopupNearCursor(
        { x: 1580, y: 300 },
        { x: 0, y: 0, width: 1600, height: 1000 },
        popupSize
      )
    ).toEqual({ x: 880, y: 314 });
  });

  it("opens above the cursor when there is not enough room below", () => {
    expect(
      positionPopupNearCursor(
        { x: 800, y: 980 },
        { x: 0, y: 0, width: 1600, height: 1000 },
        popupSize
      )
    ).toEqual({ x: 440, y: 446 });
  });

  it("uses the active display work area for multi-display coordinates", () => {
    expect(
      positionPopupNearCursor(
        { x: -500, y: 700 },
        { x: -1440, y: 100, width: 1440, height: 900 },
        popupSize
      )
    ).toEqual({ x: -860, y: 166 });
  });
});
