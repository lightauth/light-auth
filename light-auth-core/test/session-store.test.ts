import { describe, expect, it } from "vitest";
import { createLightAuthSessionStore, decryptJwt } from "../src";
import { secretKey, sessionCookie, sessionFixture, SESSION_MAX_AGE_MS, TEST_SECRET } from "./helpers/app";

const store = createLightAuthSessionStore();
const env = { LIGHT_AUTH_SECRET_VALUE: TEST_SECRET };
const basePath = "/api/auth";
const requestWith = (cookie?: string) => new Request("https://app.example/", { headers: cookie ? { cookie } : {} });

describe("default cookie session store", () => {
  it("reads the session cookie", async () => {
    const session = await store.getSession({ env, basePath, req: requestWith(`other=1; ${await sessionCookie(sessionFixture("ada", 1))}`) });
    expect(session?.providerUserId).toBe("ada");
  });

  it("reads a session cookie with a custom name", async () => {
    const cookie = (await sessionCookie(sessionFixture("ada", 1))).replace("light_auth_session=", "custom=");
    expect((await store.getSession({ env, basePath, req: requestWith(cookie), sessionName: "custom" }))?.providerUserId).toBe("ada");
  });

  it.each([undefined, "other=1", "light_auth_session=not-a-jwe"])("returns null for the cookie header %j", async (cookie) => {
    expect(await store.getSession({ env, basePath, req: requestWith(cookie) })).toBeNull();
  });

  it("writes an encrypted, HttpOnly, Secure, SameSite=Lax cookie", async () => {
    const res = new Response(null);
    await store.setSession({ env, basePath, res, session: sessionFixture("ada", 0) });

    const setCookie = res.headers.get("set-cookie")!;
    expect(setCookie).toMatch(new RegExp(`^light_auth_session=[^;]+; Max-Age=${SESSION_MAX_AGE_MS / 1000}; Path=/; HttpOnly; Secure; SameSite=Lax$`));
    const value = setCookie.slice("light_auth_session=".length, setCookie.indexOf(";"));
    expect((await decryptJwt(value, secretKey())).providerUserId).toBe("ada");
  });

  it("refuses a session too large for a cookie", async () => {
    const session = sessionFixture("ada", 0, { bio: "x".repeat(4000) });
    await expect(store.setSession({ env, basePath, res: new Response(null), session })).rejects.toThrow(/exceeds 4096 bytes/);
  });

  it("deletes the session cookie", async () => {
    const res = new Response(null);
    await store.deleteSession({ env, basePath, res, session: sessionFixture("ada", 0) });
    expect(res.headers.get("set-cookie")).toBe("light_auth_session=; Max-Age=0; Path=/; HttpOnly");
  });

  it("requires the request and the response", async () => {
    await expect(store.getSession({ env, basePath })).rejects.toThrow(/Request is required/);
    await expect(store.setSession({ env, basePath, session: sessionFixture("ada", 0) })).rejects.toThrow(/Response is required/);
    await expect(store.deleteSession({ env, basePath, session: sessionFixture("ada", 0) })).rejects.toThrow(/Response is required/);
  });

  it("generates a new session id each time", () => {
    expect(store.generateSessionId()).not.toBe(store.generateSessionId());
  });
});
