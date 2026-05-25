import { KeyIcon, MinusIcon, PasswordIcon, PlusIcon } from "@phosphor-icons/react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import type { CopClipSettingsPatch } from "../../../../shared/app-settings";
import { defaultIgnoredAppBundleIds, defaultIgnoredWindowsAppIdentifiers } from "../../../../shared/ignored-app-policy";
import { SettingsCard } from "../../components/SettingsCard";
import { SettingsRow } from "../../components/SettingsRow";
import { ToggleSwitch } from "../../components/ToggleSwitch";
import type { SettingsDraft, SettingsErrors } from "../../lib/settings-draft";
import { cx, fieldClass, settingsBorder, settingsControl, settingsFieldSurface, settingsMuted, settingsText } from "../../lib/styles";

export function PrivacySettingsPage({
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
  const [bundleIdInput, setBundleIdInput] = useState("");
  const [windowsIdentifierInput, setWindowsIdentifierInput] = useState("");

  function updateIgnoredAppBundleIds(ignoredAppBundleIds: string[]) {
    setDraftSettings((current) => ({ ...current, ignoredAppBundleIds }));
    void updateSettings({ ignoredAppBundleIds });
  }

  function addIgnoredAppBundleId() {
    const bundleId = bundleIdInput.trim();

    if (!bundleId) {
      return;
    }

    updateIgnoredAppBundleIds([...draftSettings.ignoredAppBundleIds, bundleId]);
    setBundleIdInput("");
  }

  function removeIgnoredAppBundleId(bundleId: string) {
    updateIgnoredAppBundleIds(draftSettings.ignoredAppBundleIds.filter((ignoredBundleId) => ignoredBundleId !== bundleId));
  }

  function updateIgnoredWindowsAppIdentifiers(ignoredWindowsAppIdentifiers: string[]) {
    setDraftSettings((current) => ({ ...current, ignoredWindowsAppIdentifiers }));
    void updateSettings({ ignoredWindowsAppIdentifiers });
  }

  function addIgnoredWindowsAppIdentifier() {
    const identifier = windowsIdentifierInput.trim();

    if (!identifier) {
      return;
    }

    updateIgnoredWindowsAppIdentifiers([...draftSettings.ignoredWindowsAppIdentifiers, identifier]);
    setWindowsIdentifierInput("");
  }

  function removeIgnoredWindowsAppIdentifier(identifier: string) {
    updateIgnoredWindowsAppIdentifiers(
      draftSettings.ignoredWindowsAppIdentifiers.filter((ignoredIdentifier) => ignoredIdentifier !== identifier)
    );
  }

  return (
    <>
      <SettingsCard>
        <SettingsRow note="Temporarily stop recording new clipboard items." title="Pause clipboard capture">
          <ToggleSwitch
            checked={draftSettings.capturePaused}
            label="Pause clipboard capture"
            onChange={(capturePaused) => {
              setDraftSettings((current) => ({ ...current, capturePaused }));
              void updateSettings({ capturePaused });
            }}
          />
        </SettingsRow>
      </SettingsCard>

      <h2 className={cx("mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em]", settingsText)}>Ignore macOS Applications</h2>
      <p className={cx("mx-3.5 -mt-2 text-xs leading-snug max-[560px]:text-sm", settingsMuted)}>Do not save content copied while these macOS bundle IDs are frontmost. If detection is unavailable, capture continues normally.</p>
      <SettingsCard>
        {defaultIgnoredAppBundleIds.map((bundleId, index) => (
          <div className={cx("flex min-h-[52px] items-center gap-3 border-b px-3.5 py-2.5 text-sm font-semibold", settingsBorder, settingsText)} key={bundleId}>
            {index === 0 ? <KeyIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[var(--settings-field-bg)] p-1.5 text-[var(--settings-muted)]" weight="duotone" /> : <PasswordIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[var(--settings-field-bg)] p-1.5 text-[#c79300]" weight="duotone" />}
            <span className="min-w-0 truncate">{bundleId}</span>
            <span className={cx("ml-auto shrink-0 text-[11px]", settingsMuted)}>Default</span>
          </div>
        ))}
        {draftSettings.ignoredAppBundleIds.map((bundleId) => (
          <div className={cx("flex min-h-[52px] items-center gap-3 border-b px-3.5 py-2.5 text-sm font-semibold", settingsBorder, settingsText)} key={bundleId}>
            <PasswordIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[var(--settings-field-bg)] p-1.5 text-[#c79300]" weight="duotone" />
            <span className="min-w-0 truncate">{bundleId}</span>
            <button aria-label={`Remove ignored app ${bundleId}`} className={cx("ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", settingsControl)} type="button" onClick={() => removeIgnoredAppBundleId(bundleId)}>
              <MinusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
        ))}
        <div className={cx("grid gap-2 px-2.5 py-2", settingsFieldSurface)} aria-label="Ignored application actions">
          <div className="flex gap-2">
            <input
              aria-invalid={Boolean(settingsErrors.ignoredAppBundleIds)}
              aria-label="Ignored app bundle ID"
              className={fieldClass}
              placeholder="com.example.PasswordManager"
              value={bundleIdInput}
              onChange={(event) => setBundleIdInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addIgnoredAppBundleId();
                }
              }}
            />
            <button aria-label="Add ignored app" className={cx("inline-flex h-[34px] w-9 shrink-0 items-center justify-center rounded-lg border", settingsControl)} type="button" onClick={addIgnoredAppBundleId}>
              <PlusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
          {settingsErrors.ignoredAppBundleIds ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.ignoredAppBundleIds}</em> : null}
        </div>
      </SettingsCard>

      <h2 className={cx("mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em]", settingsText)}>Ignore Windows Applications</h2>
      <p className={cx("mx-3.5 -mt-2 text-xs leading-snug max-[560px]:text-sm", settingsMuted)}>Do not save content copied while these Windows executable names or paths are frontmost. If detection is unavailable, capture continues normally.</p>
      <SettingsCard>
        {defaultIgnoredWindowsAppIdentifiers.map((identifier) => (
          <div className={cx("flex min-h-[52px] items-center gap-3 border-b px-3.5 py-2.5 text-sm font-semibold", settingsBorder, settingsText)} key={identifier}>
            <PasswordIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[var(--settings-field-bg)] p-1.5 text-[#c79300]" weight="duotone" />
            <span className="min-w-0 truncate">{identifier}</span>
            <span className={cx("ml-auto shrink-0 text-[11px]", settingsMuted)}>Default</span>
          </div>
        ))}
        {draftSettings.ignoredWindowsAppIdentifiers.map((identifier) => (
          <div className={cx("flex min-h-[52px] items-center gap-3 border-b px-3.5 py-2.5 text-sm font-semibold", settingsBorder, settingsText)} key={identifier}>
            <PasswordIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[var(--settings-field-bg)] p-1.5 text-[#c79300]" weight="duotone" />
            <span className="min-w-0 truncate">{identifier}</span>
            <button aria-label={`Remove ignored Windows app ${identifier}`} className={cx("ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border", settingsControl)} type="button" onClick={() => removeIgnoredWindowsAppIdentifier(identifier)}>
              <MinusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
        ))}
        <div className={cx("grid gap-2 px-2.5 py-2", settingsFieldSurface)} aria-label="Ignored Windows application actions">
          <div className="flex gap-2">
            <input
              aria-invalid={Boolean(settingsErrors.ignoredWindowsAppIdentifiers)}
              aria-label="Ignored Windows app executable"
              className={fieldClass}
              placeholder="PasswordManager.exe"
              value={windowsIdentifierInput}
              onChange={(event) => setWindowsIdentifierInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addIgnoredWindowsAppIdentifier();
                }
              }}
            />
            <button aria-label="Add ignored Windows app" className={cx("inline-flex h-[34px] w-9 shrink-0 items-center justify-center rounded-lg border", settingsControl)} type="button" onClick={addIgnoredWindowsAppIdentifier}>
              <PlusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
          {settingsErrors.ignoredWindowsAppIdentifiers ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.ignoredWindowsAppIdentifiers}</em> : null}
        </div>
      </SettingsCard>
    </>
  );
}
