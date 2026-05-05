import type { ReactNode } from "react";
import { cx, settingsCard } from "../lib/styles";

export function SettingsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cx(settingsCard, className)}>{children}</section>;
}
