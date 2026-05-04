import {
  BroomIcon,
  ClipboardTextIcon,
  ClockCounterClockwiseIcon,
  CodeIcon,
  GearSixIcon,
  HandPalmIcon,
  ImageIcon,
  KeyboardIcon,
  KeyIcon,
  LinkSimpleIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PasswordIcon,
  PlusIcon,
  PushPinIcon,
  PushPinSlashIcon,
  QuestionIcon,
  SealCheckIcon,
  TrashIcon,
  XIcon,
  type Icon
} from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SetStateAction } from "react";
import type { SettingsUpdateResult } from "../../preload/api";
import { defaultCopClipSettings, type CopClipSettings, type CopClipSettingsPatch } from "../../shared/app-settings";
import { clipboardItemSearchText, type ClipboardItem } from "../../shared/clipboard-history";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const settingsSurface = "bg-[#1b1f1f] text-[#e8e8e8]";
const settingsBorder = "border-[#343838]";
const settingsCard = `grid overflow-hidden rounded-xl border ${settingsBorder} bg-[#222525]`;
const settingsMuted = "text-[#a6a6a6]";
const fieldClass = "min-h-[34px] w-full min-w-0 rounded-lg border border-[#4a4f4f] bg-[#303333] px-2.5 text-xs text-[#e8e8e8] outline-none aria-[invalid=true]:border-red-500 aria-[invalid=true]:shadow-[0_0_0_3px_rgb(239_68_68_/_16%)]";
const noDrag = "[app-region:no-drag] [-webkit-app-region:no-drag]";
const drag = "[app-region:drag] [-webkit-app-region:drag]";

function formatClipAge(capturedAt: string): string {
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(capturedAt)) / 1000));

  if (elapsedSeconds < 60) {
    return "now";
  }

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes}m`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  return `${elapsedHours}h`;
}

function clipTitle(item: ClipboardItem): string {
  return item.preview.length > 64 ? `${item.preview.slice(0, 61).trimEnd()}...` : item.preview;
}

function clipKind(item: ClipboardItem): { label: string; Icon: Icon } {
  if (item.type === "image") {
    return { label: "IMG", Icon: ImageIcon };
  }

  if (item.type === "html") {
    return { label: "HTML", Icon: CodeIcon };
  }

  return item.type === "link" ? { label: "URL", Icon: LinkSimpleIcon } : { label: "TXT", Icon: ClipboardTextIcon };
}

function filterClips(items: ClipboardItem[], query: string): ClipboardItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return normalizedQuery
    ? items.filter((item) => clipboardItemSearchText(item).toLocaleLowerCase().includes(normalizedQuery))
    : items;
}

type ShortcutKeyboardEvent = Pick<KeyboardEvent | ReactKeyboardEvent<HTMLInputElement>, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">;

function acceleratorFromKeyboardEvent(event: ShortcutKeyboardEvent): string | null {
  const key = event.key === " " ? "Space" : event.key === "Enter" ? "Return" : event.key.length === 1 ? event.key.toUpperCase() : event.key;

  if (["Alt", "Control", "Meta", "Shift"].includes(key)) {
    return null;
  }

  const parts = [event.metaKey || event.ctrlKey ? "CommandOrControl" : "", event.altKey ? "Alt" : "", event.shiftKey ? "Shift" : "", key]
    .filter(Boolean);

  return parts.length >= 2 ? parts.join("+") : null;
}

function currentSurface(): "desktop" | "popup" {
  return new URLSearchParams(window.location.search).get("surface") === "desktop" ? "desktop" : "popup";
}

type SettingsErrors = SettingsUpdateResult["errors"];
type SettingsPage = "history" | "general" | "privacy" | "shortcuts" | "subscription";
type HistoryAction = "clear" | "delete" | "pin" | "unpin";

type SettingsDraft = {
  checkForUpdatesAutomatically: boolean;
  historyLimit: string;
  launchAtLogin: boolean;
  openClipboardHistoryShortcut: string;
  pasteAutomatically: boolean;
  pasteWithFormattingShortcut: string;
  popupPosition: CopClipSettings["popupPosition"];
  popupSize: {
    width: string;
    height: string;
  };
  theme: CopClipSettings["theme"];
};

const settingsPages: Array<{ id: SettingsPage; label: string; Icon: Icon }> = [
  { id: "history", label: "History", Icon: ClockCounterClockwiseIcon },
  { id: "general", label: "General", Icon: GearSixIcon },
  { id: "privacy", label: "Privacy", Icon: HandPalmIcon },
  { id: "shortcuts", label: "Shortcuts", Icon: KeyboardIcon },
  { id: "subscription", label: "Subscription", Icon: SealCheckIcon }
];

function createSettingsDraft(settings: CopClipSettings): SettingsDraft {
  return {
    checkForUpdatesAutomatically: settings.checkForUpdatesAutomatically,
    historyLimit: String(settings.historyLimit),
    launchAtLogin: settings.launchAtLogin,
    openClipboardHistoryShortcut: settings.openClipboardHistoryShortcut,
    pasteAutomatically: settings.pasteAutomatically,
    pasteWithFormattingShortcut: settings.pasteWithFormattingShortcut,
    popupPosition: settings.popupPosition,
    popupSize: {
      width: String(settings.popupSize.width),
      height: String(settings.popupSize.height)
    },
    theme: settings.theme
  };
}

function normalizeSettingsPage(hash: string): SettingsPage {
  const page = hash.replace("#", "");

  if (page === "general" || page === "privacy" || page === "shortcuts" || page === "subscription") {
    return page;
  }

  if (page === "settings") {
    return "general";
  }

  return "history";
}

function settingStatusText(status: string, errors: SettingsErrors): string {
  if (status) {
    return status;
  }

  return Object.keys(errors).length > 0 ? "Check values" : "Local";
}

function ToggleSwitch({ checked, disabled = false, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange?: (checked: boolean) => void }) {
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

function SettingsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cx(settingsCard, className)}>{children}</section>;
}

function SettingsRow({ children, note, title }: { children?: ReactNode; note?: string; title: string }) {
  return (
    <div className={cx("grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-3 last:border-b-0 max-[560px]:grid-cols-1", settingsBorder)}>
      <div>
        <strong className="block text-[15px] font-semibold tracking-[-0.01em] text-[#e8e8e8] max-[560px]:text-[19px]">{title}</strong>
        {note ? <small className={cx("mt-1 block text-xs font-normal leading-snug max-[560px]:text-sm", settingsMuted)}>{note}</small> : null}
      </div>
      {children ? <div className="flex min-w-max items-center justify-end gap-2">{children}</div> : null}
    </div>
  );
}

function DisabledControl({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <button className="min-h-7 cursor-not-allowed rounded-lg border-0 bg-[#333636] px-2.5 text-xs font-semibold text-[#ececec]" disabled title={label ?? "Planned feature"} type="button">
      {children}
    </button>
  );
}

function PinBadge({ pinned }: { pinned: boolean }) {
  return pinned ? <span className="shrink-0 rounded-full border border-[color-mix(in_oklch,var(--accent)_35%,var(--border))] bg-[color-mix(in_oklch,var(--accent-soft)_72%,transparent)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">Pinned</span> : null;
}

function ClipKindIcon({ item }: { item: ClipboardItem }) {
  const { Icon, label } = clipKind(item);

  return (
    <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] group-[.pinned]:border-[color-mix(in_oklch,var(--accent)_35%,var(--border))] group-[.pinned]:text-[var(--accent)]">
      <Icon aria-hidden="true" size={15} weight="duotone" />
      <span className="font-mono text-[8px] font-semibold leading-none">{label}</span>
    </div>
  );
}

function ClipPreview({ item }: { item: ClipboardItem }) {
  if (item.type === "image") {
    return (
      <div className="clip-image-preview mt-2 flex min-w-0 items-center gap-2.5">
        <img alt="" className="h-12 w-[72px] shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg)] object-cover" src={item.imageDataUrl} />
        <p className="m-0 line-clamp-2 overflow-hidden text-[13px] leading-snug text-[var(--muted)]">{item.preview}</p>
      </div>
    );
  }

  return <p className="mt-1.5 line-clamp-2 overflow-hidden text-[13px] leading-snug text-[var(--muted)]">{item.preview}</p>;
}

function ClipActionButtons({ item, onDelete, onPinToggle }: { item: ClipboardItem; onDelete: () => void; onPinToggle: () => void }) {
  const PinIcon = item.pinned ? PushPinSlashIcon : PushPinIcon;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Actions for ${item.preview}`}>
      <button
        aria-label={`${item.pinned ? "Unpin" : "Pin"} clipboard item: ${item.preview}`}
        className={cx("inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:border-[color-mix(in_oklch,var(--accent)_45%,var(--border))]", noDrag)}
        type="button"
        onClick={onPinToggle}
      >
        <PinIcon aria-hidden="true" size={13} weight="bold" />
        {item.pinned ? "Unpin" : "Pin"}
      </button>
      <button
        aria-label={`Delete clipboard item: ${item.preview}`}
        className={cx("inline-flex min-h-7 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--fg)] hover:border-red-500", noDrag)}
        type="button"
        onClick={onDelete}
      >
        <TrashIcon aria-hidden="true" size={13} weight="bold" />
        Delete
      </button>
    </div>
  );
}

async function performHistoryAction(action: HistoryAction, item: ClipboardItem | undefined, fallbackItems: ClipboardItem[]): Promise<ClipboardItem[]> {
  if (!window.copclip) {
    return fallbackItems;
  }

  if (action === "clear") {
    return window.copclip.clearClipboardHistory();
  }

  if (!item) {
    return fallbackItems;
  }

  if (action === "delete") {
    return window.copclip.deleteClipboardItem(item.id);
  }

  return action === "unpin" ? window.copclip.unpinClipboardItem(item.id) : window.copclip.pinClipboardItem(item.id);
}

function formatAccelerator(accelerator: string): string {
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

function ShortcutInput({ error, label, value, onChange }: { error?: string; label: string; value: string; onChange: (shortcut: string) => void }) {
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

function HistorySettingsPage() {
  const [historyItems, setHistoryItems] = useState<ClipboardItem[]>([]);
  const [historyStatus, setHistoryStatus] = useState(Boolean(window.copclip) ? "Loading" : "Unavailable");

  const loadHistory = useCallback(async () => {
    if (!window.copclip) {
      setHistoryStatus("Unavailable");
      return;
    }

    const items = await window.copclip.listClipboardHistory("");
    setHistoryItems(items);
    setHistoryStatus(`${items.length} item${items.length === 1 ? "" : "s"}`);
  }, []);

  const applyHistoryAction = useCallback(async (action: HistoryAction, item?: ClipboardItem) => {
    const items = await performHistoryAction(action, item, historyItems);
    setHistoryItems(items);
    setHistoryStatus(`${items.length} item${items.length === 1 ? "" : "s"}`);
  }, [historyItems]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardHistoryChanged((items) => {
      setHistoryItems(items);
      setHistoryStatus(`${items.length} item${items.length === 1 ? "" : "s"}`);
    });
  }, []);

  return (
    <>
      <div className="flex items-center justify-between gap-3.5">
        <p className={cx("mt-1 max-w-[680px] text-xs leading-snug max-[560px]:text-sm", settingsMuted)}>Pin reusable clips, delete individual entries, or clear local history when needed.</p>
        <button
          className="inline-flex min-h-[30px] shrink-0 items-center gap-1.5 rounded-lg border border-[#343838] bg-[#303333] px-2.5 text-xs font-semibold text-[#e8e8e8] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={historyItems.length === 0}
          type="button"
          onClick={() => void applyHistoryAction("clear")}
        >
          <BroomIcon aria-hidden="true" size={14} weight="bold" />
          Clear history
        </button>
      </div>

      <SettingsCard className="overflow-visible">
        {historyItems.map((item) => (
          <div className={cx("group grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3 border-b px-3.5 py-3.5 last:border-b-0", settingsBorder, item.pinned && "pinned")} key={item.id}>
            <ClipKindIcon item={item} />
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <strong className="truncate text-sm font-semibold text-[#e8e8e8]">{clipTitle(item)}</strong>
                <PinBadge pinned={item.pinned} />
              </div>
              <ClipPreview item={item} />
              <span className={cx("mt-2 block font-mono text-[11px]", settingsMuted)}>{formatClipAge(item.capturedAt)}</span>
            </div>
            <div className="[--border:#4a4f4f] [--fg:#e8e8e8] [--surface:#303333]">
              <ClipActionButtons
                item={item}
                onDelete={() => void applyHistoryAction("delete", item)}
                onPinToggle={() => void applyHistoryAction(item.pinned ? "unpin" : "pin", item)}
              />
            </div>
          </div>
        ))}
        {historyItems.length === 0 ? <div className={cx("grid min-h-40 place-items-center p-6 text-[13px]", settingsMuted)} role="status">{historyStatus === "Loading" ? "Loading history" : "No clipboard history yet"}</div> : null}
      </SettingsCard>
      <span className={cx("text-xs font-semibold", settingsMuted)} role="status">{historyStatus}</span>
    </>
  );
}

function GeneralSettingsPage({
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
        <SettingsRow note="Planned for a future cloud-sync milestone." title="iCloud sync">
          <span className={cx("text-xs font-semibold", settingsMuted)}>Not available</span>
          <ToggleSwitch checked={false} label="iCloud sync" disabled />
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

      <h2 className="mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em] text-[#e8e8e8]">Paste Items</h2>
      <SettingsCard>
        <label className={cx("grid min-h-[52px] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-3 last:border-b-0", settingsBorder)}>
          <input
            aria-label="To active app"
            checked={pasteToActiveApp}
            className="h-[18px] w-[18px] accent-[#087cff]"
            name="paste-destination"
            type="radio"
            onChange={() => {
              setDraftSettings((current) => ({ ...current, pasteAutomatically: true }));
              void updateSettings({ pasteAutomatically: true });
            }}
          />
          <span>
            <strong className="block text-[15px] font-semibold text-[#e8e8e8]">To active app</strong>
            <small className={cx("mt-1 block text-xs leading-snug", settingsMuted)}>Paste selected items directly to the application you are currently using.</small>
          </span>
          <span className="h-[58px] w-[86px] rounded-[10px] bg-gradient-to-br from-orange-300 via-orange-500 to-orange-700 shadow-[inset_0_-40px_0_rgb(95_38_0_/_22%)] max-[560px]:hidden" aria-hidden="true" />
        </label>
        <label className={cx("grid min-h-[52px] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 border-b px-3.5 py-3 last:border-b-0", settingsBorder)}>
          <input
            aria-label="To clipboard"
            checked={!pasteToActiveApp}
            className="h-[18px] w-[18px] accent-[#087cff]"
            name="paste-destination"
            type="radio"
            onChange={() => {
              setDraftSettings((current) => ({ ...current, pasteAutomatically: false }));
              void updateSettings({ pasteAutomatically: false });
            }}
          />
          <span>
            <strong className="block text-[15px] font-semibold text-[#e8e8e8]">To clipboard</strong>
            <small className={cx("mt-1 block text-xs leading-snug", settingsMuted)}>Copy selected items to the system clipboard to paste manually later.</small>
          </span>
        </label>
        <SettingsRow title="Always paste as Plain Text">
          <ToggleSwitch checked={false} label="Always paste as Plain Text" disabled />
        </SettingsRow>
      </SettingsCard>

      <h2 className="mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em] text-[#e8e8e8]">Existing Settings</h2>
      <SettingsCard className="grid-cols-2 gap-2.5 p-3 max-[560px]:grid-cols-1">
        <label className="grid min-w-0 gap-1">
          <span className="text-xs font-semibold text-[#e8e8e8]">Keep history limit</span>
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
          <span className="text-xs font-semibold text-[#e8e8e8]">Popup location</span>
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
            <span className="text-xs font-semibold text-[#e8e8e8]">Popup width</span>
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
            <span className="text-xs font-semibold text-[#e8e8e8]">Popup height</span>
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
          <span className="text-xs font-semibold text-[#e8e8e8]">Theme</span>
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
        <span className={cx("self-end text-xs font-semibold", settingsMuted)} role="status">{settingStatusText(settingsStatus, settingsErrors)}</span>
      </SettingsCard>
    </>
  );
}

function PrivacySettingsPage() {
  return (
    <>
      <SettingsCard>
        <SettingsRow note="Allow CopClip to appear to others when you share your screen." title="Show during screen sharing">
          <ToggleSwitch checked={false} label="Show during screen sharing" disabled />
        </SettingsRow>
        <SettingsRow note="Download web content for previews; may activate one-time or analytics-sensitive links." title="Generate link previews">
          <ToggleSwitch checked={false} label="Generate link previews" disabled />
        </SettingsRow>
      </SettingsCard>

      <SettingsCard>
        <SettingsRow note="Do not save passwords and sensitive data when detected." title="Ignore confidential content">
          <ToggleSwitch checked={false} label="Ignore confidential content" disabled />
        </SettingsRow>
        <SettingsRow note="Do not save temporary data generated by other apps." title="Ignore transient content">
          <ToggleSwitch checked={false} label="Ignore transient content" disabled />
        </SettingsRow>
      </SettingsCard>

      <h2 className="mx-3.5 -mb-2 mt-[18px] text-base font-bold tracking-[-0.02em] text-[#e8e8e8]">Ignore Applications</h2>
      <p className={cx("mx-3.5 -mt-2 text-xs leading-snug max-[560px]:text-sm", settingsMuted)}>Do not save content copied from the applications below.</p>
      <SettingsCard>
        <div className={cx("flex min-h-[52px] items-center gap-3 border-b px-3.5 py-2.5 text-sm font-semibold text-[#e8e8e8]", settingsBorder)}><KeyIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[#303333] p-1.5 text-[#c8c8c8]" weight="duotone" />Keychain Access</div>
        <div className={cx("flex min-h-[52px] items-center gap-3 border-b px-3.5 py-2.5 text-sm font-semibold text-[#e8e8e8]", settingsBorder)}><PasswordIcon aria-hidden="true" className="h-8 w-8 rounded-lg bg-[#303333] p-1.5 text-[#ffd449]" weight="duotone" />Passwords</div>
        <div className="flex gap-px bg-[#303333] px-2.5 py-1.5" aria-label="Ignored application actions">
          <DisabledControl label="Adding ignored apps is planned"><PlusIcon aria-hidden="true" size={14} weight="bold" /></DisabledControl>
          <DisabledControl label="Removing ignored apps is planned"><MinusIcon aria-hidden="true" size={14} weight="bold" /></DisabledControl>
        </div>
      </SettingsCard>
    </>
  );
}

function ShortcutsSettingsPage({
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

function SubscriptionSettingsPage() {
  return (
    <SettingsCard className="min-h-24 grid-cols-[56px_minmax(0,1fr)_92px] items-center gap-3.5 px-3.5 py-[18px] max-[560px]:grid-cols-1">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-500 to-orange-600 text-[38px] font-black text-white shadow-sm" aria-hidden="true">P</span>
      <div>
        <strong className="block text-[15px] font-semibold text-[#e8e8e8]">CopClip</strong>
        <small className={cx("mt-1 block text-xs", settingsMuted)}>Local build</small>
      </div>
      <DisabledControl label="Subscription management is planned">Manage...</DisabledControl>
    </SettingsCard>
  );
}

function DesktopShell({ settings }: { settings: CopClipSettings }) {
  const appInfo = window.copclip?.getAppInfo();
  const [activePage, setActivePage] = useState<SettingsPage>(() => normalizeSettingsPage(window.location.hash));
  const [draftSettings, setDraftSettings] = useState(() => createSettingsDraft(settings));
  const [settingsErrors, setSettingsErrors] = useState<SettingsErrors>({});
  const [settingsStatus, setSettingsStatus] = useState("");

  useEffect(() => {
    function handleHashChange() {
      setActivePage(normalizeSettingsPage(window.location.hash));
    }

    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    setDraftSettings(createSettingsDraft(settings));
  }, [settings]);

  const updateSettings = useCallback(async (patch: CopClipSettingsPatch) => {
    if (!window.copclip) {
      return;
    }

    const result = await window.copclip.updateSettings(patch);
    setSettingsErrors(result.errors);
    setSettingsStatus(result.ok ? "Saved" : "Check values");

    if (result.ok) {
      setDraftSettings(createSettingsDraft(result.settings));
    }
  }, []);

  const pageTitle = settingsPages.find((page) => page.id === activePage)?.label ?? "General";

  function choosePage(page: SettingsPage) {
    setActivePage(page);
    window.history.replaceState(null, "", `#${page}`);
  }

  function renderActivePage() {
    if (activePage === "history") {
      return <HistorySettingsPage />;
    }

    if (activePage === "privacy") {
      return <PrivacySettingsPage />;
    }

    if (activePage === "shortcuts") {
      return (
        <ShortcutsSettingsPage
          draftSettings={draftSettings}
          settingsErrors={settingsErrors}
          setDraftSettings={setDraftSettings}
          updateSettings={updateSettings}
        />
      );
    }

    if (activePage === "subscription") {
      return <SubscriptionSettingsPage />;
    }

    return (
      <GeneralSettingsPage
        draftSettings={draftSettings}
        settingsErrors={settingsErrors}
        settingsStatus={settingsStatus}
        setDraftSettings={setDraftSettings}
        updateSettings={updateSettings}
      />
    );
  }

  return (
    <main className={cx("grid h-screen grid-cols-[190px_minmax(0,1fr)] overflow-hidden rounded-[20px] border border-[#3b4040] shadow-[0_18px_48px_rgb(0_0_0_/_42%)] max-[560px]:grid-cols-1 max-[560px]:rounded-none", settingsSurface)} aria-label="CopClip desktop shell">
      <aside className="flex min-w-0 flex-col justify-between border-r border-[#242828] bg-gradient-to-r from-[#171a1a] via-[#171b1b] to-[#1a1e1e] pb-3.5 pl-3.5 pr-2.5 pt-12 max-[560px]:border-b max-[560px]:border-r-0 max-[560px]:p-[18px]" aria-label="CopClip navigation">
        <div className="min-w-0">
          <div className="h-0" aria-hidden="true" />
          <nav className="grid gap-1 max-[560px]:grid-cols-2" aria-label="Settings pages">
            {settingsPages.map((page) => {
              const selected = activePage === page.id;

              return (
                <button
                  aria-current={selected ? "page" : undefined}
                  className={cx("flex min-h-[42px] w-full items-center gap-2.5 rounded-[10px] border border-transparent px-3 text-left text-[15px] font-semibold text-[#e8e8e8] transition-colors max-[560px]:min-h-12 max-[560px]:text-lg", selected ? "bg-gradient-to-b from-[#0b7dff] to-[#025bd9] text-white" : "hover:bg-[#222525]")}
                  key={page.id}
                  type="button"
                  onClick={() => choosePage(page.id)}
                >
                  <page.Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" weight={selected ? "fill" : "regular"} />
                  <span>{page.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <button className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[15px] font-semibold text-[#e8e8e8]" disabled type="button">
          <QuestionIcon aria-hidden="true" className="h-[18px] w-[18px] rounded-full border-2 border-current p-0.5" weight="bold" />
          Help Center
        </button>
      </aside>

      <section className="h-screen min-w-0 overflow-y-auto bg-[#1b1f1f] px-6 pb-9 pt-6 [scrollbar-color:#5b6060_transparent] [scrollbar-width:thin] max-[560px]:p-[18px]">
        <header className="mb-[18px] flex items-start justify-between gap-3.5 max-[560px]:grid">
          <div>
            <h1 className="text-2xl font-bold tracking-[-0.03em] text-[#e8e8e8]">{pageTitle}</h1>
            <p className={cx("mt-1 max-w-[680px] text-xs leading-snug", settingsMuted)}>{appInfo ? `${appInfo.name} ${appInfo.version}` : "CopClip settings"}</p>
          </div>
          <span className={cx("shrink-0 rounded-full border px-2 py-1 text-[11px]", settingsBorder, settingsCard, settingsMuted)}>{settingStatusText(settingsStatus, settingsErrors)}</span>
        </header>

        <form className="grid gap-[18px]" aria-label="CopClip settings">
          {renderActivePage()}
        </form>
      </section>
    </main>
  );
}

function ClipboardPopup({ settings }: { settings: CopClipSettings }) {
  const appInfo = window.copclip?.getAppInfo();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [clips, setClips] = useState<ClipboardItem[]>([]);
  const [query, setQuery] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(Boolean(window.copclip));
  const [selectedIndex, setSelectedIndex] = useState(0);

  const loadHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory(query);

    setClips(items);
    setIsLoadingHistory(false);
  }, [query]);

  const refreshPopupHistory = useCallback(async () => {
    if (!window.copclip) {
      setIsLoadingHistory(false);
      return;
    }

    const items = await window.copclip.listClipboardHistory("");

    setQuery("");
    setClips(items);
    setIsLoadingHistory(false);
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardHistoryChanged((items) => {
      setClips(filterClips(items, query));
    });
  }, [query]);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    return window.copclip.onClipboardPopupOpened(() => {
      void refreshPopupHistory();
    });
  }, [refreshPopupHistory]);

  useEffect(() => {
    window.addEventListener("focus", refreshPopupHistory);
    return () => {
      window.removeEventListener("focus", refreshPopupHistory);
    };
  }, [refreshPopupHistory]);

  useEffect(() => {
    setSelectedIndex((currentIndex) => {
      if (clips.length === 0) {
        return 0;
      }

      return Math.min(Math.max(currentIndex, 0), clips.length - 1);
    });
  }, [clips.length]);

  const restoreClip = useCallback(async (clip: ClipboardItem | undefined) => {
    if (!clip || !window.copclip) {
      return;
    }

    await window.copclip.restoreClipboardItem(clip.id);
  }, []);

  const dismissPopup = useCallback(() => {
    void window.copclip?.dismissClipboardPopup();
  }, []);

  const applyPopupHistoryAction = useCallback(async (action: HistoryAction, clip?: ClipboardItem) => {
    const items = await performHistoryAction(action, clip, clips);
    setClips(filterClips(items, query));
  }, [clips, query]);

  useEffect(() => {
    function handlePopupKeyDown(event: KeyboardEvent) {
      if (event.key === "," && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void window.copclip?.openSettings();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        dismissPopup();
        return;
      }

      if (clips.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => Math.min(currentIndex + 1, clips.length - 1));
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((currentIndex) => Math.max(currentIndex - 1, 0));
        return;
      }

      if (acceleratorFromKeyboardEvent(event) === settings.pasteWithFormattingShortcut) {
        event.preventDefault();
        void restoreClip(clips[selectedIndex]);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void restoreClip(clips[selectedIndex]);
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        const shortcutIndex = Number(event.key) - 1;

        if (shortcutIndex < clips.length) {
          event.preventDefault();
          setSelectedIndex(shortcutIndex);
          void restoreClip(clips[shortcutIndex]);
        }
      }
    }

    window.addEventListener("keydown", handlePopupKeyDown);
    return () => {
      window.removeEventListener("keydown", handlePopupKeyDown);
    };
  }, [clips, dismissPopup, restoreClip, selectedIndex, settings.pasteWithFormattingShortcut]);

  const statusText = useMemo(() => {
    if (isLoadingHistory) {
      return "Loading";
    }

    return `${clips.length} item${clips.length === 1 ? "" : "s"}`;
  }, [clips.length, isLoadingHistory]);

  return (
    <main className="min-h-screen p-0" aria-label="CopClip clipboard popup">
      <section className="h-screen overflow-hidden border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_60px_color-mix(in_oklch,var(--fg)_12%,transparent)]" aria-label="Clipboard popup">
        <div className="border-b border-[var(--border)] bg-[color-mix(in_oklch,var(--surface)_92%,var(--bg))] px-[18px] pb-3.5 pt-[18px]">
          <div className={cx("mb-3.5 flex items-center justify-between gap-4", drag)}>
            <h1 className="text-[22px] font-bold leading-tight text-[var(--fg)]">Clipboard history</h1>
            <div className="flex items-center gap-2.5">
              <button
                className={cx("inline-flex min-h-[26px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-50", noDrag)}
                disabled={clips.length === 0}
                type="button"
                onClick={() => void applyPopupHistoryAction("clear")}
              >
                <BroomIcon aria-hidden="true" size={13} weight="bold" />
                Clear
              </button>
              <span className="font-mono text-[11px] text-[var(--muted)]">{appInfo ? `${appInfo.name} ${appInfo.version}` : statusText}</span>
            </div>
          </div>
          <label className={cx("flex h-11 items-center gap-2.5 rounded-[10px] border border-[color-mix(in_oklch,var(--accent)_36%,var(--border))] bg-[var(--surface)] px-3 shadow-[0_0_0_4px_color-mix(in_oklch,var(--accent)_8%,transparent)]", noDrag)}>
            <MagnifyingGlassIcon aria-hidden="true" className="text-[var(--muted)]" size={17} />
            <input
              aria-label="Search clipboard history"
              className="w-full border-0 bg-transparent text-[15px] text-[var(--fg)] outline-none placeholder:text-[var(--muted)]"
              placeholder="Search copied text, links, or images"
              ref={searchInputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <kbd className="inline-flex min-w-[30px] justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--fg)]">Esc</kbd>
          </label>
        </div>

        <div className={cx("grid h-[calc(100vh-119px)] content-start overflow-y-auto", noDrag)} aria-label="Clipboard history results">
          {clips.map((clip, index) => (
            <div
              className={cx("group relative border-b border-[var(--border)]", clip.pinned && "pinned")}
              key={clip.id}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <button
                aria-label={`Restore clipboard item ${index + 1}: ${clip.preview}`}
                aria-selected={index === selectedIndex}
                className={cx(
                  "grid min-h-[86px] w-full grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3 bg-transparent py-[15px] pl-[18px] pr-28 text-left text-[var(--fg)] outline-none hover:bg-[color-mix(in_oklch,var(--accent-soft)_74%,var(--surface))] focus-visible:bg-[color-mix(in_oklch,var(--accent-soft)_74%,var(--surface))]",
                  index === selectedIndex && "bg-[color-mix(in_oklch,var(--accent-soft)_74%,var(--surface))] shadow-[inset_3px_0_0_var(--accent)]"
                )}
                type="button"
                onClick={() => void restoreClip(clip)}
              >
                <ClipKindIcon item={clip} />
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] font-mono text-[11px] text-[var(--muted)]">{index + 1}</span>
                    <strong className="truncate text-sm font-semibold text-[var(--fg)]">{clipTitle(clip)}</strong>
                    <PinBadge pinned={clip.pinned} />
                  </div>
                  <ClipPreview item={clip} />
                </div>
                <span className="font-mono text-[11px] text-[var(--muted)]">{formatClipAge(clip.capturedAt)}</span>
              </button>
              <div className="absolute right-3.5 top-3.5">
                <ClipActionButtons
                  item={clip}
                  onDelete={() => void applyPopupHistoryAction("delete", clip)}
                  onPinToggle={() => void applyPopupHistoryAction(clip.pinned ? "unpin" : "pin", clip)}
                />
              </div>
            </div>
          ))}
          {clips.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center p-7 text-sm text-[var(--muted)]" role="status">
              {query ? "No matching clips" : statusText === "Loading" ? "Loading history" : "Copy text, links, or images to start history"}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export function App() {
  const [settings, setSettings] = useState(defaultCopClipSettings);

  useEffect(() => {
    if (!window.copclip) {
      return undefined;
    }

    void window.copclip.getSettings().then(setSettings);
    return window.copclip.onSettingsChanged(setSettings);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  return currentSurface() === "desktop" ? <DesktopShell settings={settings} /> : <ClipboardPopup settings={settings} />;
}
