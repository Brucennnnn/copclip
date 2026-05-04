type CommandLineSwitches = {
  appendSwitch: (name: string, value?: string) => void;
  getSwitchValue?: (name: string) => string;
  hasSwitch?: (name: string) => boolean;
};

const waylandGlobalShortcutsFeature = "GlobalShortcutsPortal";

export function isLinuxWaylandSession(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return platform === "linux" && (env.XDG_SESSION_TYPE === "wayland" || Boolean(env.WAYLAND_DISPLAY));
}

export function enableWaylandGlobalShortcuts(
  commandLine: CommandLineSwitches,
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!isLinuxWaylandSession(platform, env)) {
    return false;
  }

  const existingValue = commandLine.hasSwitch?.("enable-features")
    ? (commandLine.getSwitchValue?.("enable-features") ?? "")
    : "";
  const features = existingValue.split(",").map((feature) => feature.trim()).filter(Boolean);

  if (!features.includes(waylandGlobalShortcutsFeature)) {
    features.push(waylandGlobalShortcutsFeature);
  }

  commandLine.appendSwitch("enable-features", features.join(","));
  return true;
}
