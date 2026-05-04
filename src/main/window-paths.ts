import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type RendererSurface = "desktop" | "popup";

export function preloadScriptPath(baseDir: string): string {
  return join(baseDir, "../preload/index.mjs");
}

export function rendererDevUrl(baseUrl: string, surface: RendererSurface): string {
  const url = new URL(baseUrl);
  url.searchParams.set("surface", surface);
  return url.toString();
}

export function rendererFileUrl(baseDir: string, surface: RendererSurface): string {
  const url = pathToFileURL(join(baseDir, "../renderer/index.html"));
  url.searchParams.set("surface", surface);
  return url.toString();
}
