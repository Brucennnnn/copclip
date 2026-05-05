import type { KeyboardEvent as ReactKeyboardEvent } from "react";

type ShortcutKeyboardEvent = Pick<KeyboardEvent | ReactKeyboardEvent<HTMLInputElement>, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

export function acceleratorFromKeyboardEvent(event: ShortcutKeyboardEvent): string | null {
  const key = event.key === " " ? "Space" : event.key === "Enter" ? "Return" : event.key.length === 1 ? event.key.toUpperCase() : event.key;

  if (["Alt", "Control", "Meta", "Shift"].includes(key)) {
    return null;
  }

  const parts = [event.metaKey || event.ctrlKey ? "CommandOrControl" : "", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : "", key]
    .filter(Boolean);

  return parts.length >= 2 ? parts.join("+") : null;
}

export function formatAccelerator(accelerator: string): string {
  return accelerator
    .replaceAll("CommandOrControl", "⌘")
    .replaceAll("Command", "⌘")
    .replaceAll("Control", "⌃")
    .replaceAll("Alt", "⌥")
    .replaceAll("Option", "⌥")
    .replaceAll("Shift", "⇧")
    .replaceAll("Return", "↩")
    .replaceAll("+", "");
}
