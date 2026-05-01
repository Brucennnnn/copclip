export type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Point = {
  x: number;
  y: number;
};

export type Size = {
  width: number;
  height: number;
};

const cursorOffset = 14;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

export function positionPopupNearCursor(cursor: Point, displayWorkArea: Rectangle, popupSize: Size): Point {
  const maximumX = displayWorkArea.x + displayWorkArea.width - popupSize.width;
  const maximumY = displayWorkArea.y + displayWorkArea.height - popupSize.height;
  const preferredX = cursor.x - Math.round(popupSize.width / 2);
  const preferredY = cursor.y + cursorOffset;
  const fallbackY = cursor.y - popupSize.height - cursorOffset;
  const hasRoomBelow = preferredY + popupSize.height <= displayWorkArea.y + displayWorkArea.height;
  const nextY = hasRoomBelow ? preferredY : fallbackY;

  return {
    x: clamp(preferredX, displayWorkArea.x, Math.max(displayWorkArea.x, maximumX)),
    y: clamp(nextY, displayWorkArea.y, Math.max(displayWorkArea.y, maximumY))
  };
}
