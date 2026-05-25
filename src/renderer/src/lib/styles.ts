export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const settingsSurface = "bg-[var(--settings-bg)] text-[var(--settings-fg)]";
export const settingsText = "text-[var(--settings-fg)]";
export const settingsPanel = "bg-[var(--settings-bg)]";
export const settingsBorder = "border-[var(--settings-border)]";
export const settingsCard = `grid overflow-hidden rounded-xl border ${settingsBorder} bg-[var(--settings-card)]`;
export const settingsMuted = "text-[var(--settings-muted)]";
export const settingsFieldSurface = "bg-[var(--settings-field-bg)]";
export const settingsControl = "border-[var(--settings-border)] bg-[var(--settings-field-bg)] text-[var(--settings-fg)]";
export const fieldClass = "min-h-[34px] w-full min-w-0 rounded-lg border border-[var(--settings-field-border)] bg-[var(--settings-field-bg)] px-2.5 text-xs text-[var(--settings-field-fg)] outline-none aria-[invalid=true]:border-red-500 aria-[invalid=true]:shadow-[0_0_0_3px_rgb(239_68_68_/_16%)]";
export const noDrag = "[app-region:no-drag] [-webkit-app-region:no-drag]";
export const drag = "[app-region:drag] [-webkit-app-region:drag]";
