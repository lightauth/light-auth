import { EncryptJWT } from "jose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFetchSessionServerFunction, createSetSessionServerFunction, createSetUserServerFunction } from "../src";
import { createTestApp, DAY_MS, forbidNetwork, readSessionCookie, secretKey, SESSION_MAX_AGE_MS, sessionCookie, sessionFixture } from "./helpers/app";

const expectClampedToMaxAge = (expiresAt: unknown) => {
  expect(Math.abs(new Date(expiresAt as string).getTime() - (Date.now() + SESSION_MAX_AGE_MS))).toBeLessThan(5000);
};

beforeEach(() => {
  forbidNetwork();
});

describe("POST /session", () => {
  it("returns null without session cookie", async () => {
    const { response } = await createTestApp().call("POST", "/api/auth/session");
    expect(await response?.json()).toBeNull();
  });

  it("returns the session without renewing it before half of its lifetime", async () => {
    const { response, res } = await createTestApp().call("POST", "/api/auth/session", { cookie: await sessionCookie(sessionFixture("ada", 5)) });
    expect((await response?.json()).providerUserId).toBe("ada");
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it("renews the session after half of its lifetime (sliding expiration)", async () => {
    const onSessionSaved = vi.fn();
    const { res } = await createTestApp({ onSessionSaved }).call("POST", "/api/auth/session", { cookie: await sessionCookie(sessionFixture("ada", 16)) });
    const renewed = await readSessionCookie(res);
    expectClampedToMaxAge(renewed?.expiresAt);
    expect(onSessionSaved).toHaveBeenCalledWith(expect.objectContaining({ providerUserId: "ada" }), expect.anything());
  });

  it("rejects an expired session issued before the exp claim, deletes its cookie and raises onSessionExpired", async () => {
    const onSessionExpired = vi.fn();
    const app = createTestApp({ onSessionExpired });
    // cookies issued by previous versions have no exp claim: only expiresAt tells that they are expired
    const legacyToken = await new EncryptJWT({ ...sessionFixture("ada", 31), expiresAt: new Date(Date.now() - DAY_MS).toISOString() })
      .setProtectedHeader({ alg: "dir", enc: "A128CBC-HS256" })
      .encrypt(new TextEncoder().encode(secretKey()));

    const { response, res } = await app.call("POST", "/api/auth/session", { cookie: `light_auth_session=${legacyToken}` });
    expect(await response?.json()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledOnce();
    expect(res.headers.get("set-cookie")).toMatch(/light_auth_session=;.*Max-Age=0/);
  });

  it("rejects a session cookie whose exp claim has passed", async () => {
    const { response } = await createTestApp().call("POST", "/api/auth/session", { cookie: await sessionCookie(sessionFixture("ada", 31)) });
    expect(await response?.json()).toBeNull();
  });

  it.each([undefined, "not-a-date"])("fails closed on a missing or invalid expiresAt (%s)", async (expiresAt) => {
    const { response } = await createTestApp().call("POST", "/api/auth/session", { cookie: await sessionCookie({ ...sessionFixture("ada", 0), expiresAt }) });
    expect(await response?.json()).toBeNull();
  });

  it("clamps a far-future expiresAt to the maximum lifetime", async () => {
    const cookie = await sessionCookie({ ...sessionFixture("ada", 0), expiresAt: "9999-12-31T00:00:00.000Z" });
    const { response } = await createTestApp().call("POST", "/api/auth/session", { cookie });
    expectClampedToMaxAge((await response?.json()).expiresAt);
  });
});

describe("session and user writes", () => {
  it.each(["set_session", "set_user"])("exposes no %s HTTP endpoint", async (route) => {
    const app = createTestApp();
    const forged = { ...sessionFixture("victim", 0), expiresAt: "9999-12-31T00:00:00.000Z", role: "admin", accessToken: "attacker-token" };
    const { response, res } = await app.call("POST", `/api/auth/${route}`, { headers: { "content-type": "application/json" }, body: JSON.stringify(forged) });
    expect(response).toBeNull();
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(app.users.size).toBe(0);
  });

  it("setAuthSession (server) saves the session in-process and clamps its expiration", async () => {
    const app = createTestApp();
    const res = new Response(null);
    const saved = await createSetSessionServerFunction(app.config)({ req: new Request("https://app.example/"), res, session: { ...sessionFixture("ada", 0), expiresAt: new Date("9999-12-31") } });
    expectClampedToMaxAge(saved?.expiresAt);
    expect((await readSessionCookie(res))?.providerUserId).toBe("ada");
  });

  it("setUser (server) saves the user in-process", async () => {
    const app = createTestApp();
    await createSetUserServerFunction(app.config)({ user: { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada" } });
    expect(app.users.get("ada")?.email).toBe("ada@example.com");
  });

  it("setAuthSession and setUser (server) run the saving hooks", async () => {
    const app = createTestApp({
      onSessionSaving: (session) => ({ ...session, tenant: "acme" }),
      onSessionSaved: vi.fn(),
      onUserSaving: (user) => ({ ...user, tenant: "acme" }),
      onUserSaved: vi.fn(),
    });
    const res = new Response(null);
    await createSetSessionServerFunction(app.config)({ req: new Request("https://app.example/"), res, session: sessionFixture("ada", 0) });
    await createSetUserServerFunction(app.config)({ user: { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada" } });

    expect(await readSessionCookie(res)).toMatchObject({ providerUserId: "ada", tenant: "acme" });
    expect(app.users.get("ada")).toMatchObject({ tenant: "acme" });
    expect(app.config.onSessionSaved).toHaveBeenCalledWith(expect.objectContaining({ tenant: "acme" }), expect.anything());
    expect(app.config.onUserSaved).toHaveBeenCalledWith(expect.objectContaining({ tenant: "acme" }), expect.anything());
  });
});

describe("getAuthSession (server)", () => {
  it("reads the session cookie in-process, whatever the Host header", async () => {
    const fetchMock = forbidNetwork();
    const app = createTestApp();
    const req = new Request("https://attacker.example/page", { headers: { host: "attacker.example:8443", cookie: await sessionCookie(sessionFixture("ada", 1)) } });

    const session = await createFetchSessionServerFunction(app.config)({ req });
    expect(session?.providerUserId).toBe("ada");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null for an expired session", async () => {
    const app = createTestApp();
    const req = new Request("https://app.example/", { headers: { cookie: await sessionCookie(sessionFixture("ada", 31)) } });
    expect(await createFetchSessionServerFunction(app.config)({ req })).toBeNull();
  });
});
