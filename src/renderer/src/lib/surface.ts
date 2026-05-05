export function currentSurface(): "desktop" | "popup" {
  return new URLSearchParams(window.location.search).get("surface") === "desktop" ? "desktop" : "popup";
}
