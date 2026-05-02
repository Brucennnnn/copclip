export function isDebugEnabled(): boolean {
  return process.env.COPCLIP_DEBUG === "1";
}

export function debugLog(scope: string, message: string, details: Record<string, unknown> = {}): void {
  if (!isDebugEnabled()) {
    return;
  }

  console.info(`[copclip:${scope}] ${message}`, details);
}

export function textSummary(text: string): Record<string, unknown> {
  return {
    length: text.length,
    isBlank: text.trim().length === 0
  };
}
