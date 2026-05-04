import type { IpcMainInvokeEvent } from "electron";
import { rendererDevUrl, rendererFileUrl, type RendererSurface } from "./window-paths";

type RendererTrustPolicyOptions = {
  baseDir: string;
  devRendererUrl?: string;
};

export type IpcSenderValidator = (
  event: IpcMainInvokeEvent,
  allowedSurfaces: readonly RendererSurface[]
) => boolean;

function normalizeUrl(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function trustedUrlForSurface(options: RendererTrustPolicyOptions, surface: RendererSurface): string {
  return options.devRendererUrl ? rendererDevUrl(options.devRendererUrl, surface) : rendererFileUrl(options.baseDir, surface);
}

export function createRendererTrustPolicy(options: RendererTrustPolicyOptions) {
  function isTrustedRendererUrl(url: string, allowedSurfaces: readonly RendererSurface[]): boolean {
    const normalizedUrl = normalizeUrl(url);

    if (!normalizedUrl) {
      return false;
    }

    return allowedSurfaces.some((surface) => normalizeUrl(trustedUrlForSurface(options, surface)) === normalizedUrl);
  }

  function isTrustedIpcSender(event: IpcMainInvokeEvent, allowedSurfaces: readonly RendererSurface[]): boolean {
    return typeof event.senderFrame?.url === "string" && isTrustedRendererUrl(event.senderFrame.url, allowedSurfaces);
  }

  function shouldBlockNavigation(
    url: string,
    allowedSurfaces: readonly RendererSurface[],
    isMainFrame: boolean | undefined
  ): boolean {
    return isMainFrame !== false && !isTrustedRendererUrl(url, allowedSurfaces);
  }

  return {
    isTrustedIpcSender,
    isTrustedRendererUrl,
    shouldBlockNavigation,
    trustedUrlForSurface: (surface: RendererSurface) => trustedUrlForSurface(options, surface)
  };
}

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}
