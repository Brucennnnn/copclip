import { join } from "node:path";

export function preloadScriptPath(baseDir: string): string {
  return join(baseDir, "../preload/index.mjs");
}
