export const openPopupFlag = "--open-popup";

export type StartupSurface = "desktop" | "popup";

export function requestedStartupSurface(argv: string[] = process.argv): StartupSurface {
  return argv.includes(openPopupFlag) ? "popup" : "desktop";
}
