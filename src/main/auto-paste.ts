import { execFile, execFileSync } from "node:child_process";
import { systemPreferences } from "electron";
import { debugLog } from "./debug-log";

const osascriptPath = "/usr/bin/osascript";
const pasteDelayMs = 120;

let pasteTargetBundleId: string | null = null;
let pasteAutomatically = true;

export function configureAutoPaste(options: { pasteAutomatically: boolean }): void {
  pasteAutomatically = options.pasteAutomatically;
}

function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function createPasteScript(bundleId: string | null): string {
  const activateTarget = bundleId ? `tell application id "${escapeAppleScriptString(bundleId)}" to activate\ndelay 0.05\n` : "";
  return `${activateTarget}tell application "System Events" to keystroke "v" using command down`;
}

export function capturePasteTargetApplication(): string | null {
  if (process.platform !== "darwin") {
    pasteTargetBundleId = null;
    return null;
  }

  try {
    const bundleId = execFileSync(osascriptPath, ["-e", "id of application (path to frontmost application as text)"], {
      encoding: "utf8",
      timeout: 1000
    }).trim();

    pasteTargetBundleId = bundleId || null;
    debugLog("paste", "captured paste target", { bundleId: pasteTargetBundleId ?? "" });
    return pasteTargetBundleId;
  } catch (error) {
    pasteTargetBundleId = null;
    debugLog("paste", "failed to capture paste target", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export function schedulePasteIntoTargetApplication(): boolean {
  if (!pasteAutomatically) {
    debugLog("paste", "auto-paste disabled");
    return false;
  }

  if (process.platform !== "darwin") {
    return false;
  }

  if (!systemPreferences.isTrustedAccessibilityClient(true)) {
    debugLog("paste", "accessibility permission required for auto-paste");
    return false;
  }

  const targetBundleId = pasteTargetBundleId;

  setTimeout(() => {
    execFile(osascriptPath, ["-e", createPasteScript(targetBundleId)], { timeout: 3000 }, (error) => {
      if (error) {
        debugLog("paste", "auto-paste failed", { error: error.message });
        return;
      }

      debugLog("paste", "auto-paste sent", { bundleId: targetBundleId ?? "" });
    });
  }, pasteDelayMs);

  return true;
}
