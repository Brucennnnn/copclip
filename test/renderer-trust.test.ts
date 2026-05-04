import { describe, expect, it } from "vitest";
import { createRendererTrustPolicy, isAllowedExternalUrl } from "../src/main/renderer-trust";

describe("renderer trust policy", () => {
  it("trusts only packaged renderer URLs for the requested surface", () => {
    const policy = createRendererTrustPolicy({ baseDir: "/app/out/main" });

    expect(policy.isTrustedRendererUrl("file:///app/out/renderer/index.html?surface=popup#search", ["popup"])).toBe(true);
    expect(policy.isTrustedRendererUrl("file:///app/out/renderer/index.html?surface=desktop", ["popup"])).toBe(false);
    expect(policy.isTrustedRendererUrl("https://evil.example/?surface=popup", ["popup"])).toBe(false);
  });

  it("trusts only dev renderer URLs for the requested surface during development", () => {
    const policy = createRendererTrustPolicy({
      baseDir: "/app/out/main",
      devRendererUrl: "http://localhost:5173/?debug=1"
    });

    expect(policy.isTrustedRendererUrl("http://localhost:5173/?debug=1&surface=desktop#settings", ["desktop"])).toBe(true);
    expect(policy.isTrustedRendererUrl("file:///app/out/renderer/index.html?surface=desktop", ["desktop"])).toBe(false);
  });

  it("validates IPC senders against allowed surfaces", () => {
    const policy = createRendererTrustPolicy({ baseDir: "/app/out/main" });
    const event = {
      senderFrame: {
        url: "file:///app/out/renderer/index.html?surface=desktop#settings"
      }
    };

    expect(policy.isTrustedIpcSender(event as never, ["desktop"])).toBe(true);
    expect(policy.isTrustedIpcSender(event as never, ["popup"])).toBe(false);
  });

  it("blocks untrusted top-level navigations even when Electron omits the main-frame flag", () => {
    const policy = createRendererTrustPolicy({ baseDir: "/app/out/main" });

    expect(policy.shouldBlockNavigation("https://evil.example/", ["desktop"], undefined)).toBe(true);
    expect(policy.shouldBlockNavigation("https://evil.example/", ["desktop"], false)).toBe(false);
    expect(policy.shouldBlockNavigation("file:///app/out/renderer/index.html?surface=desktop", ["desktop"], undefined)).toBe(false);
  });

  it("allows only http and https external links", () => {
    expect(isAllowedExternalUrl("https://example.com/docs")).toBe(true);
    expect(isAllowedExternalUrl("http://example.com/docs")).toBe(true);
    expect(isAllowedExternalUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedExternalUrl("copclip://settings")).toBe(false);
    expect(isAllowedExternalUrl("not a url")).toBe(false);
  });
});
