import type { ReactNode } from "react";

export function DisabledControl({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <button className="inline-flex min-h-7 cursor-not-allowed items-center justify-center rounded-lg border-0 bg-[var(--settings-disabled-control-bg)] px-2.5 text-xs font-semibold text-[var(--settings-disabled-control-fg)]" disabled title={label ?? "Planned feature"} type="button">
      {children}
    </button>
  );
}
