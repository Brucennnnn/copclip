import { cx } from "../lib/styles";

export function ToggleSwitch({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange?: (checked: boolean) => void }) {
  return (
    <label className={cx("relative block h-6 w-11", disabled ? "cursor-not-allowed opacity-80" : "cursor-pointer")}>
      <input
        aria-label={label}
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        type="checkbox"
        onChange={(event) => onChange?.(event.target.checked)}
      />
      <span className="absolute inset-0 rounded-full bg-[#3a3d3d] transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-[#e8e8e8] after:transition-transform peer-checked:bg-[#087cff] peer-checked:after:translate-x-5" />
    </label>
  );
}
