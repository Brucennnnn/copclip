import type { ReactNode } from "react";
import { cx, settingsBorder, settingsMuted, settingsText } from "../lib/styles";

export function SettingsRow({ children, note, title }: { children?: ReactNode; note?: string; title: string }) {
  return (
    <div className={cx("grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-3 last:border-b-0 max-[560px]:grid-cols-1", settingsBorder)}>
      <div>
        <strong className={cx("block text-[15px] font-semibold tracking-[-0.01em] max-[560px]:text-[19px]", settingsText)}>{title}</strong>
        {note ? <small className={cx("mt-1 block text-xs font-normal leading-snug max-[560px]:text-sm", settingsMuted)}>{note}</small> : null}
      </div>
      {children ? <div className="flex min-w-max items-center justify-end gap-2">{children}</div> : null}
    </div>
  );
}
