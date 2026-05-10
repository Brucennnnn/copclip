export type IgnoredAppPolicy = {
  ignoredAppBundleIds: string[];
  ignoredWindowsAppIdentifiers?: string[];
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

export const defaultIgnoredWindowsAppIdentifiers = [
  "1Password.exe",
  "Bitwarden.exe",
  "Dashlane.exe",
  "KeePassXC.exe"
] as const;

export type ActiveAppPolicyIdentity =
  | {
      platform: "darwin";
      bundleId: string;
    }
  | {
      platform: "win32";
      executableName: string;
      executablePath: string | null;
    };

function normalizeAppIdentifier(identifier: string): string {
  return identifier.trim().replace(/\\/g, "/").toLocaleLowerCase();
}

export function ignoredAppBundleIdsForDisplay(userBundleIds: string[]): string[] {
  const seen = new Set<string>();
  const bundleIds: string[] = [];

  for (const bundleId of [...defaultIgnoredAppBundleIds, ...userBundleIds]) {
    const normalized = normalizeAppIdentifier(bundleId);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    bundleIds.push(bundleId);
  }

  return bundleIds;
}

export function ignoredWindowsAppIdentifiersForDisplay(userIdentifiers: string[]): string[] {
  const seen = new Set<string>();
  const identifiers: string[] = [];

  for (const identifier of [...defaultIgnoredWindowsAppIdentifiers, ...userIdentifiers]) {
    const normalized = normalizeAppIdentifier(identifier);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    identifiers.push(identifier);
  }

  return identifiers;
}

export function shouldIgnoreActiveApp(
  activeApp: ActiveAppPolicyIdentity | null | undefined,
  policy: IgnoredAppPolicy
): boolean {
  if (!activeApp) {
    return false;
  }

  if (activeApp.platform === "darwin") {
    const ignoredBundleIds = new Set(ignoredAppBundleIdsForDisplay(policy.ignoredAppBundleIds).map(normalizeAppIdentifier));
    return ignoredBundleIds.has(normalizeAppIdentifier(activeApp.bundleId));
  }

  const ignoredWindowsIdentifiers = new Set(
    ignoredWindowsAppIdentifiersForDisplay(policy.ignoredWindowsAppIdentifiers ?? []).map(normalizeAppIdentifier)
  );

  return (
    ignoredWindowsIdentifiers.has(normalizeAppIdentifier(activeApp.executableName)) ||
    Boolean(activeApp.executablePath && ignoredWindowsIdentifiers.has(normalizeAppIdentifier(activeApp.executablePath)))
  );
}

export function shouldIgnoreFrontmostApp(
  frontmostBundleId: string | null | undefined,
  policy: IgnoredAppPolicy
): boolean {
  return shouldIgnoreActiveApp(frontmostBundleId ? { platform: "darwin", bundleId: frontmostBundleId } : null, policy);
}
