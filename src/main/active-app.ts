import { execFileSync } from "node:child_process";
import { debugLog } from "./debug-log";

const osascriptPath = "/usr/bin/osascript";

export type ActiveAppIdentity =
  | {
      platform: "darwin";
      bundleId: string;
    }
  | {
      platform: "win32";
      executableName: string;
      executablePath: string | null;
    };

type WindowsForegroundAppResult = {
  executableName?: unknown;
  executablePath?: unknown;
};

function parseWindowsForegroundAppResult(output: string): ActiveAppIdentity | null {
  const parsed = JSON.parse(output) as WindowsForegroundAppResult;
  const executableName = typeof parsed.executableName === "string" ? parsed.executableName.trim() : "";
  const executablePath = typeof parsed.executablePath === "string" && parsed.executablePath.trim() ? parsed.executablePath.trim() : null;

  if (!executableName) {
    return null;
  }

  return {
    platform: "win32",
    executableName,
    executablePath
  };
}

function getMacActiveAppIdentity(): ActiveAppIdentity | null {
  try {
    const bundleId = execFileSync(osascriptPath, ["-e", "id of application (path to frontmost application as text)"], {
      encoding: "utf8",
      timeout: 1000
    }).trim();

    return bundleId ? { platform: "darwin", bundleId } : null;
  } catch (error) {
    debugLog("privacy", "failed to detect frontmost app", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

function getWindowsActiveAppIdentity(): ActiveAppIdentity | null {
  const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class ForegroundWindow {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$handle = [ForegroundWindow]::GetForegroundWindow()
if ($handle -eq [IntPtr]::Zero) { exit 0 }
$processId = 0
[void][ForegroundWindow]::GetWindowThreadProcessId($handle, [ref]$processId)
if ($processId -eq 0) { exit 0 }
$process = [System.Diagnostics.Process]::GetProcessById($processId)
$executableName = $process.ProcessName
if (-not $executableName.EndsWith(".exe", [System.StringComparison]::OrdinalIgnoreCase)) {
  $executableName = $executableName + ".exe"
}
$executablePath = $null
try {
  $executablePath = $process.MainModule.FileName
} catch {}
[pscustomobject]@{
  executableName = $executableName
  executablePath = $executablePath
} | ConvertTo-Json -Compress
`;

  try {
    const output = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script], {
      encoding: "utf8",
      timeout: 1000
    }).trim();

    return output ? parseWindowsForegroundAppResult(output) : null;
  } catch (error) {
    debugLog("privacy", "failed to detect foreground windows app", { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

export function getActiveAppIdentity(): ActiveAppIdentity | null {
  if (process.platform === "darwin") {
    return getMacActiveAppIdentity();
  }

  if (process.platform === "win32") {
    return getWindowsActiveAppIdentity();
  }

  return null;
}
