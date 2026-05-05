import type { Dispatch, SetStateAction } from "react";
import type { CopClipSettingsPatch } from "../../../../shared/app-settings";
import { DisabledControl } from "../../components/DisabledControl";
import { SettingsCard } from "../../components/SettingsCard";
import { SettingsRow } from "../../components/SettingsRow";
import { ShortcutInput } from "../../components/ShortcutInput";
import type { SettingsDraft, SettingsErrors } from "../../lib/settings-draft";
import { cx, settingsMuted } from "../../lib/styles";

export function ShortcutsSettingsPage({
  draftSettings,
  settingsErrors,
  setDraftSettings,
  updateSettings
}: {
  draftSettings: SettingsDraft;
  settingsErrors: SettingsErrors;
  setDraftSettings: Dispatch<SetStateAction<SettingsDraft>>;
  updateSettings: (patch: CopClipSettingsPatch) => Promise<void>;
}) {
  return (
    <>
      <SettingsCard>
        <ShortcutInput
          error={settingsErrors.openClipboardHistoryShortcut}
          label="Activate Paste"
          value={draftSettings.openClipboardHistoryShortcut}
          onChange={(openClipboardHistoryShortcut) => {
            setDraftSettings((current) => ({ ...current, openClipboardHistoryShortcut }));
            void updateSettings({ openClipboardHistoryShortcut });
          }}
        />
        <ShortcutInput
          error={settingsErrors.pasteWithFormattingShortcut}
          label="Activate Paste Stack"
          value={draftSettings.pasteWithFormattingShortcut}
          onChange={(pasteWithFormattingShortcut) => {
            setDraftSettings((current) => ({ ...current, pasteWithFormattingShortcut }));
            void updateSettings({ pasteWithFormattingShortcut });
          }}
        />
      </SettingsCard>

      <SettingsCard>
        <SettingsRow title="Show next Pinboard"><DisabledControl>⌘→ ×</DisabledControl></SettingsRow>
        <SettingsRow title="Show previous Pinboard"><DisabledControl>⌘← ×</DisabledControl></SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow title="Quick Paste"><span className={cx("text-xs font-semibold", settingsMuted)}>⌘ Command ⇧ + 1...9</span></SettingsRow>
        <SettingsRow title="Plain Text mode"><span className={cx("text-xs font-semibold", settingsMuted)}>⇧ Shift ⇧</span></SettingsRow>
      </SettingsCard>
      <div className="flex justify-end"><DisabledControl label="Reset shortcuts is planned">Reset shortcuts to default...</DisabledControl></div>
    </>
  );
}
