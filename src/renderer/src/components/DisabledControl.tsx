import type { ReactNode } from "react";

export function DisabledControl({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <button className="min-h-7 cursor-not-allowed rounded-lg border-0 bg-[#333636] px-2.5 text-xs font-semibold text-[#ececec]" disabled title={label ?? "Planned feature"} type="button">
      {children}
    </button>
  );
}
