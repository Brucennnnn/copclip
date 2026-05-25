import { useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { acceleratorFromKeyboardEvent, formatAccelerator } from "../lib/shortcuts";
import { cx, settingsBorder, settingsText } from "../lib/styles";

export function ShortcutInput({ error, label, value, onChange }: { error?: string; label: string; value: string; onChange: (shortcut: string) => void }) {
  const [isCapturing, setIsCapturing] = useState(false);

  return (
    <label className={cx("grid min-h-[52px] grid-cols-[minmax(0,1fr)_118px_28px] items-center gap-3 border-b px-3.5 py-3 last:border-b-0 max-[560px]:grid-cols-1", settingsBorder)}>
      <span className={cx("block text-[15px] font-semibold tracking-[-0.01em] max-[560px]:text-[19px]", settingsText)}>{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        className={cx("h-[34px] rounded-lg border px-2.5 text-center text-sm font-semibold outline-none", isCapturing ? "border-[var(--settings-focus)] bg-[var(--settings-focus-bg)] text-[var(--settings-focus-fg)] shadow-[0_0_0_3px_var(--settings-focus-ring)]" : "border-[var(--settings-field-border)] bg-[var(--settings-shortcut-bg)] text-[var(--settings-field-fg)]")}
        readOnly
        value={isCapturing ? "Press shortcut..." : formatAccelerator(value)}
        onBlur={() => setIsCapturing(false)}
        onFocus={() => setIsCapturing(true)}
        onKeyDown={(event) => {
          event.preventDefault();
          const shortcut = acceleratorFromKeyboardEvent(event);

          if (shortcut) {
            setIsCapturing(false);
            onChange(shortcut);
          }
        }}
      />
      <button
        aria-label={`Disable ${label} shortcut`}
        className="inline-flex min-h-7 items-center justify-center rounded-lg border-0 bg-[var(--settings-disabled-control-bg)] px-2.5 text-xs font-semibold text-[var(--settings-disabled-control-fg)] transition-colors hover:bg-[var(--settings-control-hover)]"
        title="Disable shortcut"
        type="button"
        onClick={(event) => {
          event.preventDefault();
          setIsCapturing(false);
          onChange("");
        }}
      >
        <XIcon aria-hidden="true" size={14} weight="bold" />
      </button>
      {error ? <em className="col-span-2 col-start-2 text-[11px] not-italic leading-snug text-red-500">{error}</em> : null}
    </label>
  );
}
