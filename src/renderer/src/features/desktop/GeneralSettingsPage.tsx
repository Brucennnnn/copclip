import type { Dispatch, SetStateAction } from "react";
import type { CopClipSettings, CopClipSettingsPatch } from "../../../../shared/app-settings";
import { SettingsCard } from "../../components/SettingsCard";
import { SettingsRow } from "../../components/SettingsRow";
import { ToggleSwitch } from "../../components/ToggleSwitch";
import type { SettingsDraft, SettingsErrors } from "../../lib/settings-draft";
import { cx, fieldClass, settingsBorder, settingsMuted, settingsText } from "../../lib/styles";

export function GeneralSettingsPage({
  draftSettings,
  settingsErrors,
  settingsStatus,
  setDraftSettings,
  updateSettings
}: {
  draftSettings: SettingsDraft;
  settingsErrors: SettingsErrors;
  settingsStatus: string;
  setDraftSettings: Dispatch<SetStateAction<SettingsDraft>>;
  updateSettings: (patch: CopClipSettingsPatch) => Promise<void>;
}) {
  const pasteToActiveApp = draftSettings.pasteAutomatically;

  return (
    <>
      <SettingsCard>
        <SettingsRow title="Open at login">
          <ToggleSwitch
            checked={draftSettings.launchAtLogin}
            label="Open at login"
            onChange={(launchAtLogin) => {
              setDraftSettings((current) => ({ ...current, launchAtLogin }));
              void updateSettings({ launchAtLogin });
            }}
          />
        </SettingsRow>
        <SettingsRow note="Keep CopClip available from the menu bar." title="Run in background">
          <ToggleSwitch checked label="Run in background" disabled />
        </SettingsRow>
        <SettingsRow note="Uses the existing automatic update preference until updater UI is added." title="Check for updates">
          <ToggleSwitch
            checked={draftSettings.checkForUpdatesAutomatically}
            label="Check for updates"
            onChange={(checkForUpdatesAutomatically) => {
              setDraftSettings((current) => ({ ...current, checkForUpdatesAutomatically }));
              void updateSettings({ checkForUpdatesAutomatically });
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <h2 className={cx("mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em]", settingsText)}>Paste Items</h2>
      <SettingsCard>
        <label className={cx("grid min-h-[52px] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-3 last:border-b-0", settingsBorder)}>
          <input
            aria-label="To active app"
            checked={pasteToActiveApp}
            className="h-[18px] w-[18px] accent-[var(--settings-focus)]"
            name="paste-destination"
            type="radio"
            onChange={() => {
              setDraftSettings((current) => ({ ...current, pasteAutomatically: true }));
              void updateSettings({ pasteAutomatically: true });
            }}
          />
          <span>
            <strong className={cx("block text-[15px] font-semibold", settingsText)}>To active app</strong>
            <small className={cx("mt-1 block text-xs leading-snug", settingsMuted)}>Paste selected items directly to the application you are currently using.</small>
          </span>
          <span className="h-[58px] w-[86px] rounded-[10px] bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[inset_0_-40px_0_rgb(95_38_0_/_22%)] max-[560px]:hidden" aria-hidden="true" />
        </label>
        <label className={cx("grid min-h-[52px] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-3 last:border-b-0", settingsBorder)}>
          <input
            aria-label="To clipboard"
            checked={!pasteToActiveApp}
            className="h-[18px] w-[18px] accent-[var(--settings-focus)]"
            name="paste-destination"
            type="radio"
            onChange={() => {
              setDraftSettings((current) => ({ ...current, pasteAutomatically: false }));
              void updateSettings({ pasteAutomatically: false });
            }}
          />
          <span>
            <strong className={cx("block text-[15px] font-semibold", settingsText)}>To clipboard</strong>
            <small className={cx("mt-1 block text-xs leading-snug", settingsMuted)}>Copy selected items to the system clipboard to paste manually later.</small>
          </span>
        </label>
        <SettingsRow title="Always paste as Plain Text">
          <ToggleSwitch checked={false} label="Always paste as Plain Text" disabled />
        </SettingsRow>
      </SettingsCard>

      <h2 className={cx("mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em]", settingsText)}>Existing Settings</h2>
      <SettingsCard className="grid-cols-2 gap-2.5 p-3 max-[560px]:grid-cols-1">
        <label className="grid min-w-0 gap-1">
          <span className={cx("text-xs font-semibold", settingsText)}>Keep history limit</span>
          <input
            aria-invalid={Boolean(settingsErrors.historyLimit)}
            className={fieldClass}
            min={1}
            max={5000}
            type="number"
            value={draftSettings.historyLimit}
            onBlur={() => void updateSettings({ historyLimit: draftSettings.historyLimit })}
            onChange={(event) => setDraftSettings((current) => ({ ...current, historyLimit: event.target.value }))}
          />
          {settingsErrors.historyLimit ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.historyLimit}</em> : null}
        </label>
        <label className="grid min-w-0 gap-1">
          <span className={cx("text-xs font-semibold", settingsText)}>Popup location</span>
          <select
            aria-label="Popup location"
            className={fieldClass}
            value={draftSettings.popupPosition}
            onChange={(event) => {
              const popupPosition = event.target.value as CopClipSettings["popupPosition"];
              setDraftSettings((current) => ({ ...current, popupPosition }));
              void updateSettings({ popupPosition });
            }}
          >
            <option value="cursor">Drop down at cursor</option>
            <option value="bottom">Bottom</option>
            <option value="top">Top</option>
            <option value="center">Center</option>
            <option value="last-position">Last position</option>
          </select>
          {settingsErrors.popupPosition ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.popupPosition}</em> : null}
        </label>
        <div className="grid grid-cols-2 gap-2 max-[560px]:grid-cols-1" aria-label="Popup size">
          <label className="grid min-w-0 gap-1">
            <span className={cx("text-xs font-semibold", settingsText)}>Popup width</span>
            <input
              aria-invalid={Boolean(settingsErrors["popupSize.width"])}
              className={fieldClass}
              min={320}
              max={900}
              type="number"
              value={draftSettings.popupSize.width}
              onBlur={() => void updateSettings({ popupSize: draftSettings.popupSize })}
              onChange={(event) => setDraftSettings((current) => ({ ...current, popupSize: { ...current.popupSize, width: event.target.value } }))}
            />
            {settingsErrors["popupSize.width"] ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors["popupSize.width"]}</em> : null}
          </label>
          <label className="grid min-w-0 gap-1">
            <span className={cx("text-xs font-semibold", settingsText)}>Popup height</span>
            <input
              aria-invalid={Boolean(settingsErrors["popupSize.height"])}
              className={fieldClass}
              min={360}
              max={900}
              type="number"
              value={draftSettings.popupSize.height}
              onBlur={() => void updateSettings({ popupSize: draftSettings.popupSize })}
              onChange={(event) => setDraftSettings((current) => ({ ...current, popupSize: { ...current.popupSize, height: event.target.value } }))}
            />
            {settingsErrors["popupSize.height"] ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors["popupSize.height"]}</em> : null}
          </label>
        </div>
        <label className="grid min-w-0 gap-1">
          <span className={cx("text-xs font-semibold", settingsText)}>Theme</span>
          <select
            className={fieldClass}
            value={draftSettings.theme}
            onChange={(event) => {
              const theme = event.target.value as CopClipSettings["theme"];
              setDraftSettings((current) => ({ ...current, theme }));
              void updateSettings({ theme });
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          {settingsErrors.theme ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.theme}</em> : null}
        </label>
        <span className={cx("self-end text-xs font-semibold", settingsMuted)} role="status">{settingsStatus || (Object.keys(settingsErrors).length > 0 ? "Check values" : "Local")}</span>
      </SettingsCard>
    </>
  );
}
