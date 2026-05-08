export type IgnoredAppPolicy = {
  ignoredAppBundleIds: string[];
};

export const defaultIgnoredAppBundleIds = [
  "com.apple.keychainaccess",
  "com.apple.Passwords",
  "com.1password.1password",
  "com.agilebits.onepassword7",
  "com.bitwarden.desktop",
  "com.dashlane.dashlane-desktop",
  "org.keepassxc.keepassxc"
] as const;

function normalizeBundleId(bundleId: string): string {
  return bundleId.trim().toLocaleLowerCase();
}

export function ignoredAppBundleIdsForDisplay(userBundleIds: string[]): string[] {
  const seen = new Set<string>();
  const bundleIds: string[] = [];

  for (const bundleId of [...defaultIgnoredAppBundleIds, ...userBundleIds]) {
    const normalized = normalizeBundleId(bundleId);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    bundleIds.push(bundleId);
  }

  return bundleIds;
}

export function shouldIgnoreFrontmostApp(
  frontmostBundleId: string | null | undefined,
  policy: IgnoredAppPolicy
): boolean {
  if (!frontmostBundleId) {
    return false;
  }

  const ignoredBundleIds = new Set(ignoredAppBundleIdsForDisplay(policy.ignoredAppBundleIds).map(normalizeBundleId));
  return ignoredBundleIds.has(normalizeBundleId(frontmostBundleId));
}
