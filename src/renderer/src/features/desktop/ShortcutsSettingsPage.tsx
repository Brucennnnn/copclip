import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { CheckIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { defaultCopClipSettings, type CopClipPinboard, type CopClipSettingsPatch } from "../../../../shared/app-settings";
import { SettingsCard } from "../../components/SettingsCard";
import { SettingsRow } from "../../components/SettingsRow";
import { ShortcutInput } from "../../components/ShortcutInput";
import type { SettingsDraft, SettingsErrors } from "../../lib/settings-draft";
import { cx, fieldClass, settingsBorder, settingsControl, settingsFieldSurface, settingsMuted, settingsText } from "../../lib/styles";

function createPinboardId(name: string): string {
  const slug = name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);
  const randomId = typeof crypto.randomUUID === "function" ? crypto.randomUUID().slice(0, 8) : String(Date.now()).slice(-8);
  return `${slug || "pinboard"}-${randomId}`;
}

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
  const [pinboardName, setPinboardName] = useState("");

  function savePinboards(pinboards: CopClipPinboard[], activePinboardId = draftSettings.activePinboardId) {
    setDraftSettings((current) => ({ ...current, activePinboardId, pinboards }));
    void updateSettings({ activePinboardId, pinboards });
  }

  function addPinboard() {
    const name = pinboardName.trim();

    if (!name) {
      return;
    }

    const pinboard = {
      id: createPinboardId(name),
      name
    };

    savePinboards([...draftSettings.pinboards, pinboard], pinboard.id);
    setPinboardName("");
  }

  function removePinboard(pinboardId: string) {
    if (draftSettings.pinboards.length <= 1) {
      return;
    }

    const pinboards = draftSettings.pinboards.filter((pinboard) => pinboard.id !== pinboardId);
    const activePinboardId = draftSettings.activePinboardId === pinboardId ? pinboards[0].id : draftSettings.activePinboardId;
    savePinboards(pinboards, activePinboardId);
  }

  function activatePinboard(activePinboardId: string) {
    setDraftSettings((current) => ({ ...current, activePinboardId }));
    void updateSettings({ activePinboardId });
  }

  function resetShortcuts() {
    const patch = {
      openClipboardHistoryShortcut: defaultCopClipSettings.openClipboardHistoryShortcut,
      pasteWithFormattingShortcut: defaultCopClipSettings.pasteWithFormattingShortcut,
      showNextPinboardShortcut: defaultCopClipSettings.showNextPinboardShortcut,
      showPreviousPinboardShortcut: defaultCopClipSettings.showPreviousPinboardShortcut
    };

    setDraftSettings((current) => ({ ...current, ...patch }));
    void updateSettings(patch);
  }

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
        <ShortcutInput
          error={settingsErrors.showNextPinboardShortcut}
          label="Show next Pinboard"
          value={draftSettings.showNextPinboardShortcut}
          onChange={(showNextPinboardShortcut) => {
            setDraftSettings((current) => ({ ...current, showNextPinboardShortcut }));
            void updateSettings({ showNextPinboardShortcut });
          }}
        />
        <ShortcutInput
          error={settingsErrors.showPreviousPinboardShortcut}
          label="Show previous Pinboard"
          value={draftSettings.showPreviousPinboardShortcut}
          onChange={(showPreviousPinboardShortcut) => {
            setDraftSettings((current) => ({ ...current, showPreviousPinboardShortcut }));
            void updateSettings({ showPreviousPinboardShortcut });
          }}
        />
      </SettingsCard>

      <h2 className={cx("mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em]", settingsText)}>Pinboards</h2>
      <SettingsCard>
        {draftSettings.pinboards.map((pinboard) => {
          const active = pinboard.id === draftSettings.activePinboardId;

          return (
            <div className={cx("grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2 border-b px-3.5 py-2.5 last:border-b-0 max-[560px]:grid-cols-1", settingsBorder)} key={pinboard.id}>
              <button
                aria-label={`Activate pinboard ${pinboard.name}`}
                className={cx("flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold", active ? "bg-[var(--settings-focus-bg)] text-[var(--settings-focus-fg)]" : settingsText)}
                type="button"
                onClick={() => activatePinboard(pinboard.id)}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[var(--settings-field-border)]">
                  {active ? <CheckIcon aria-hidden="true" size={12} weight="bold" /> : null}
                </span>
                <span className="min-w-0 truncate">{pinboard.name}</span>
              </button>
              <span className={cx("px-2 text-[11px] font-semibold", settingsMuted)}>{active ? "Active" : ""}</span>
              <button
                aria-label={`Remove pinboard ${pinboard.name}`}
                className={cx("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-50", settingsControl)}
                disabled={draftSettings.pinboards.length <= 1}
                type="button"
                onClick={() => removePinboard(pinboard.id)}
              >
                <TrashIcon aria-hidden="true" size={14} weight="bold" />
              </button>
            </div>
          );
        })}
        <div className={cx("grid gap-2 px-2.5 py-2", settingsFieldSurface)} aria-label="Pinboard actions">
          <div className="flex gap-2">
            <input
              aria-invalid={Boolean(settingsErrors.pinboards)}
              aria-label="Pinboard name"
              className={fieldClass}
              maxLength={40}
              placeholder="Work"
              value={pinboardName}
              onChange={(event) => setPinboardName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addPinboard();
                }
              }}
            />
            <button aria-label="Add pinboard" className={cx("inline-flex h-[34px] w-9 shrink-0 items-center justify-center rounded-lg border", settingsControl)} type="button" onClick={addPinboard}>
              <PlusIcon aria-hidden="true" size={14} weight="bold" />
            </button>
          </div>
          {settingsErrors.pinboards ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.pinboards}</em> : null}
          {settingsErrors.activePinboardId ? <em className="text-[11px] not-italic leading-snug text-red-500">{settingsErrors.activePinboardId}</em> : null}
        </div>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow title="Quick Paste"><span className={cx("text-xs font-semibold", settingsMuted)}>⌘ Command ⇧ + 1...9</span></SettingsRow>
        <SettingsRow title="Plain Text mode"><span className={cx("text-xs font-semibold", settingsMuted)}>⇧ Shift ⇧</span></SettingsRow>
      </SettingsCard>
      <div className="flex justify-end">
        <button
          className={cx("inline-flex min-h-7 items-center justify-center rounded-lg border px-2.5 text-xs font-semibold", settingsControl)}
          type="button"
          onClick={resetShortcuts}
        >
          Reset shortcuts to default...
        </button>
      </div>
    </>
  );
}
