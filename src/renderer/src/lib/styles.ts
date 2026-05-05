export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const settingsSurface = "bg-[#1b1f1f] text-[#e8e8e8]";
export const settingsBorder = "border-[#343838]";
export const settingsCard = `grid overflow-hidden rounded-xl border ${settingsBorder} bg-[#222525]`;
export const settingsMuted = "text-[#a6a6a6]";
export const fieldClass = "min-h-[34px] w-full min-w-0 rounded-lg border border-[#4a4f4f] bg-[#303333] px-2.5 text-xs text-[#e8e8e8] outline-none aria-[invalid=true]:border-red-500 aria-[invalid=true]:shadow-[0_0_0_3px_rgb(239_68_68_/_16%)]";
export const noDrag = "[app-region:no-drag] [-webkit-app-region:no-drag]";
export const drag = "[app-region:drag] [-webkit-app-region:drag]";
