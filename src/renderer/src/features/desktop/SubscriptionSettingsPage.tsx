import { DisabledControl } from "../../components/DisabledControl";
import { SettingsCard } from "../../components/SettingsCard";
import { cx, settingsMuted, settingsText } from "../../lib/styles";

export function SubscriptionSettingsPage() {
  return (
    <SettingsCard className="min-h-24 grid-cols-[56px_minmax(0,1fr)_92px] items-center gap-3.5 px-3.5 py-[18px] max-[560px]:grid-cols-1">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-300 via-orange-500 to-orange-600 text-[38px] font-black text-white shadow-sm" aria-hidden="true">P</span>
      <div>
        <strong className={cx("block text-[15px] font-semibold", settingsText)}>CopClip</strong>
        <small className={cx("mt-1 block text-xs", settingsMuted)}>Local build</small>
      </div>
      <DisabledControl label="Subscription management is planned">Manage...</DisabledControl>
    </SettingsCard>
  );
}
