import { XIcon } from "@phosphor-icons/react";
import { DisabledControl } from "./DisabledControl";
import { acceleratorFromKeyboardEvent, formatAccelerator } from "../lib/shortcuts";
import { cx, settingsBorder } from "../lib/styles";

export function ShortcutInput({ error, label, value, onChange }: { error?: string; label: string; value: string; onChange: (shortcut: string) => void }) {
  return (
    <label className={cx("grid min-h-[52px] grid-cols-[minmax(0,1fr)_118px_28px] items-center gap-3 border-b px-3.5 py-3 last:border-b-0 max-[560px]:grid-cols-1", settingsBorder)}>
      <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[#e8e8e8] max-[560px]:text-[19px]">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        className="h-[34px] rounded-lg border border-[#4a4f4f] bg-[#5f6264] px-2.5 text-center text-sm font-semibold text-[#f0f0f0] outline-none"
        readOnly
        value={formatAccelerator(value)}
        onKeyDown={(event) => {
          event.preventDefault();
          const shortcut = acceleratorFromKeyboardEvent(event);

          if (shortcut) {
            onChange(shortcut);
          }
        }}
      />
      <DisabledControl label="Shortcut clearing is planned"><XIcon aria-hidden="true" size={14} weight="bold" /></DisabledControl>
      {error ? <em className="col-span-2 col-start-2 text-[11px] not-italic leading-snug text-red-500">{error}</em> : null}
    </label>
  );
}
