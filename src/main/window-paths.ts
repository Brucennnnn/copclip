import { join } from "node:path";

export type RendererSurface = "desktop" | "popup";

export function preloadScriptPath(baseDir: string): string {
  return join(baseDir, "../preload/index.mjs");
}

export function rendererDevUrl(baseUrl: string, surface: RendererSurface): string {
  const url = new URL(baseUrl);
  url.searchParams.set("surface", surface);
  return url.toString();
}
