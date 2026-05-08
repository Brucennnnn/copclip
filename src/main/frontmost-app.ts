import { execFileSync } from "node:child_process";
import { debugLog } from "./debug-log";

const osascriptPath = "/usr/bin/osascript";

export function getFrontmostAppBundleId(): string | null {
  if (process.platform !== "darwin") {
    return null;
  }

  try {
    const bundleId = execFileSync(osascriptPath, ["-e", "id of application (path to frontmost application as text)"], {
      encoding: "utf8",
      timeout: 1000
    }).trim();

    return bundleId || null;
  } catch (error) {
    debugLog("privacy", "failed to detect frontmost app", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}
