import { QuestionIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import type { CopClipSettings, CopClipSettingsPatch } from "../../../../shared/app-settings";
import { createSettingsDraft, normalizeSettingsPage, settingStatusText, type SettingsErrors, type SettingsPage } from "../../lib/settings-draft";
import { cx, drag, settingsBorder, settingsCard, settingsMuted, settingsSurface } from "../../lib/styles";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import { HistorySettingsPage } from "./HistorySettingsPage";
import { PrivacySettingsPage } from "./PrivacySettingsPage";
import { settingsPages } from "./settings-pages";
import { ShortcutsSettingsPage } from "./ShortcutsSettingsPage";
import { SubscriptionSettingsPage } from "./SubscriptionSettingsPage";

export function DesktopShell({ settings }: { settings: CopClipSettings }) {
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
      return (
        <PrivacySettingsPage
          draftSettings={draftSettings}
          settingsErrors={settingsErrors}
          setDraftSettings={setDraftSettings}
          updateSettings={updateSettings}
        />
      );
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
      <div className={cx("fixed left-0 right-0 top-0 z-10 h-11", drag)} data-window-drag-region="desktop" aria-hidden="true" />
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
