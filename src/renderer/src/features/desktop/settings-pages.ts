import { ClockCounterClockwiseIcon, GearSixIcon, HandPalmIcon, KeyboardIcon, SealCheckIcon, type Icon } from "@phosphor-icons/react";
import type { SettingsPage } from "../../lib/settings-draft";

export const settingsPages: Array<{ id: SettingsPage; label: string; Icon: Icon }> = [
  { id: "history", label: "History", Icon: ClockCounterClockwiseIcon },
  { id: "general", label: "General", Icon: GearSixIcon },
  { id: "privacy", label: "Privacy", Icon: HandPalmIcon },
  { id: "shortcuts", label: "Shortcuts", Icon: KeyboardIcon },
  { id: "subscription", label: "Subscription", Icon: SealCheckIcon }
];
