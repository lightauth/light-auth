import { describe, expect, it, vi } from "vitest";
import {
  buildFullUrl,
  buildSecret,
  createCredentialsProvider,
  createOAuth2Provider,
  DEFAULT_SESSION_EXPIRATION,
  getSessionExpirationMaxAge,
  isCredentialsProvider,
  isOAuthProvider,
  isSessionExpired,
  resolveBasePath,
  sanitizeCallbackUrl,
  shouldRenewSession,
} from "../src";
import { DAY_MS, SESSION_MAX_AGE_MS } from "./helpers/app";

const MAX_AGE_SECONDS = SESSION_MAX_AGE_MS / 1000;
const sessionAged = (ageDays: number) => ({ expiresAt: new Date(Date.now() - ageDays * DAY_MS + SESSION_MAX_AGE_MS) });

describe("sanitizeCallbackUrl", () => {
  it.each<[string | null, string | undefined, string]>([
    ["/dashboard?tab=1#top", undefined, "/dashboard?tab=1#top"],
    ["dashboard", undefined, "/dashboard"],
    ["https://evil.example", undefined, "/"],
    ["//evil.example/path", undefined, "/"],
    ["/\\evil.example/path", undefined, "/"],
    ["/.//evil.example", undefined, "/evil.example"],
    ["http://light-auth.invalid//evil.example", undefined, "/evil.example"],
    ["javascript:alert(1)", undefined, "/"],
    ["https://app.example/profile?x=1", "https://app.example", "/profile?x=1"],
    ["https://app.example.evil.com/profile", "https://app.example", "/"],
    [null, undefined, "/"],
    ["", undefined, "/"],
  ])("sanitizes %j (allowed origin: %s) to %j", (callbackUrl, allowedOrigin, expected) => {
    expect(sanitizeCallbackUrl(callbackUrl, allowedOrigin)).toBe(expected);
  });
});

describe("isSessionExpired", () => {
  it("is false for a session expiring in the future", () => {
    expect(isSessionExpired({ expiresAt: new Date(Date.now() + 60_000) })).toBe(false);
  });

  it("reads the string form of expiresAt, as deserialized from the cookie", () => {
    expect(isSessionExpired({ expiresAt: new Date(Date.now() + 60_000).toISOString() as unknown as Date })).toBe(false);
  });

  it("is true for a past expiresAt", () => {
    expect(isSessionExpired({ expiresAt: new Date(Date.now() - 1000) })).toBe(true);
  });

  it.each([undefined, null, "not-a-date"])("fails closed on a missing or invalid expiresAt (%s)", (expiresAt) => {
    expect(isSessionExpired({ expiresAt: expiresAt as unknown as Date })).toBe(true);
  });

  it("is true without session", () => {
    expect(isSessionExpired(null)).toBe(true);
  });
});

describe("shouldRenewSession", () => {
  it("does not renew before half of the lifetime", () => {
    expect(shouldRenewSession(sessionAged(5), MAX_AGE_SECONDS)).toBe(false);
  });

  it("renews after half of the lifetime", () => {
    expect(shouldRenewSession(sessionAged(16), MAX_AGE_SECONDS)).toBe(true);
  });

  it("renews an expiresAt beyond the maximum lifetime, so that it gets clamped", () => {
    expect(shouldRenewSession({ expiresAt: new Date("9999-12-31") }, MAX_AGE_SECONDS)).toBe(true);
  });

  it("renews an invalid expiresAt", () => {
    expect(shouldRenewSession({ expiresAt: "not-a-date" as unknown as Date }, MAX_AGE_SECONDS)).toBe(true);
  });
});

describe("buildSecret", () => {
  it("requires LIGHT_AUTH_SECRET_VALUE", () => {
    expect(() => buildSecret({})).toThrow(/LIGHT_AUTH_SECRET_VALUE is required/);
    expect(() => buildSecret()).toThrow(/config.env is required/);
  });

  it("rejects a short secret instead of padding it", () => {
    expect(() => buildSecret({ LIGHT_AUTH_SECRET_VALUE: "summer2024" })).toThrow(/at least 32 characters/);
  });

  it("keeps the first 32 characters of a long secret, so that existing sessions stay valid", () => {
    const secret = `${"a".repeat(20)}${"b".repeat(30)}`;
    expect(buildSecret({ LIGHT_AUTH_SECRET_VALUE: secret })).toBe(secret.slice(0, 32));
  });
});

describe("resolveBasePath", () => {
  it.each<[string | undefined, Record<string, string>, string]>([
    [undefined, {}, "/api/auth"],
    [undefined, { LIGHT_AUTH_BASE_PATH: "/custom/auth" }, "/custom/auth"],
    ["auth/", {}, "/auth"],
    ["//api//auth", {}, "/api/auth"],
  ])("resolves %j (env %j) to %s", (basePath, env, expected) => {
    expect(resolveBasePath(basePath, env)).toBe(expected);
  });
});

describe("buildFullUrl", () => {
  const headers = (init: Record<string, string>) => new Headers(init);

  it("keeps absolute URLs", () => {
    expect(buildFullUrl({ url: "https://app.example/a?b=1", incomingHeaders: headers({ host: "other.example" }) })).toBe("https://app.example/a?b=1");
  });

  it("builds the URL from the host, with the protocol of the proxy", () => {
    expect(buildFullUrl({ url: "/api/auth/session", incomingHeaders: headers({ host: "app.example", "x-forwarded-proto": "https, http" }) })).toBe(
      "https://app.example/api/auth/session"
    );
    expect(buildFullUrl({ url: "api/auth/session", incomingHeaders: headers({ "x-forwarded-host": "app.example/" }) })).toBe("http://app.example/api/auth/session");
  });

  it("keeps the relative URL without host", () => {
    expect(buildFullUrl({ url: "/api/auth/session", incomingHeaders: headers({}) })).toBe("/api/auth/session");
  });
});

describe("getSessionExpirationMaxAge", () => {
  it("reads LIGHT_AUTH_SESSION_EXPIRATION", () => {
    vi.stubEnv("LIGHT_AUTH_SESSION_EXPIRATION", "3600");
    expect(getSessionExpirationMaxAge()).toBe(3600);
  });

  it.each(["not-a-number", "-5", "0"])("falls back to 30 days for %j", (value) => {
    vi.stubEnv("LIGHT_AUTH_SESSION_EXPIRATION", value);
    expect(getSessionExpirationMaxAge()).toBe(DEFAULT_SESSION_EXPIRATION);
  });
});

describe("provider type guards", () => {
  it("tells OAuth and credentials providers apart", () => {
    const oauthProvider = createOAuth2Provider({ providerName: "o", clientId: "id", authorizationEndpoint: "https://a.example/a", tokenEndpoint: "https://a.example/t" });
    const credentialsProvider = createCredentialsProvider({ providerName: "c", verifyCredentials: () => null });
    expect([isOAuthProvider(oauthProvider), isCredentialsProvider(oauthProvider)]).toEqual([true, false]);
    expect([isOAuthProvider(credentialsProvider), isCredentialsProvider(credentialsProvider)]).toEqual([false, true]);
  });
});
