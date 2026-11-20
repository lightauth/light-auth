import { beforeEach, describe, expect, it } from "vitest";
import { createCredentialsProvider, createOAuth2Provider, CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CSRF_TOKEN_PARAM_NAME } from "../src";
import { createTestApp, csrfFixture, forbidNetwork, readSessionCookie, sessionCookie, sessionFixture, type TestApp } from "./helpers/app";

let app: TestApp;

beforeEach(() => {
  forbidNetwork();
  app = createTestApp({
    providers: [
      createOAuth2Provider({
        providerName: "test",
        clientId: "test-client",
        clientSecret: "secret",
        authorizationEndpoint: "https://idp.test/authorize",
        tokenEndpoint: "https://idp.test/token",
      }),
      createCredentialsProvider({
        providerName: "credentials",
        verifyCredentials: async (email, password) => (password === "good-password" ? { sub: "c-1", email, name: "Cred" } : null),
      }),
    ],
  });
  app.users.set("ada", { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada" });
});

describe("login", () => {
  it("rejects a login carrying the CSRF cookie only", async () => {
    const csrf = await csrfFixture();
    const { error } = await app.call("GET", "/api/auth/login/test", { cookie: csrf.cookie });
    expect(error).toBe("Invalid CSRF token");
  });

  it("rejects a token that does not match the cookie", async () => {
    const victim = await csrfFixture();
    const attacker = await csrfFixture();
    const { error } = await app.call("GET", `/api/auth/login/test?${CSRF_TOKEN_PARAM_NAME}=${attacker.token}`, { cookie: victim.cookie });
    expect(error).toBe("Invalid CSRF token");
  });

  it("rejects an unsigned CSRF cookie", async () => {
    const { error } = await app.call("GET", `/api/auth/login/test?${CSRF_TOKEN_PARAM_NAME}=forged`, { cookie: `${CSRF_COOKIE_NAME}=signature.forged` });
    expect(error).toBe("Invalid CSRF token");
  });

  it("redirects to the provider and keeps a sanitized callback URL", async () => {
    const csrf = await csrfFixture();
    const { response } = await app.call("GET", `/api/auth/login/test?callbackUrl=https://evil.example&${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toMatch(/^https:\/\/idp\.test\/authorize\?/);
    expect(app.writtenCookies.find((c) => c.name === "test_light_auth_callback_url")?.value).toBe("/");
  });

  it("deletes the CSRF cookie with the path it was set with", async () => {
    const csrf = await csrfFixture();
    await app.call("GET", `/api/auth/login/test?${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
    expect(app.writtenCookies).toContainEqual(expect.objectContaining({ name: CSRF_COOKIE_NAME, maxAge: 0, path: "/" }));
  });
});

describe("logout", () => {
  it("rejects a cross-site logout and keeps the user", async () => {
    const csrf = await csrfFixture();
    const { error } = await app.call("GET", "/api/auth/logout?revokeToken=true", { cookie: `${await sessionCookie(sessionFixture("ada", 1))}; ${csrf.cookie}` });
    expect(error).toBe("Invalid CSRF token");
    expect(app.users.has("ada")).toBe(true);
  });

  it("logs out with the CSRF token and redirects to a same-origin path", async () => {
    const csrf = await csrfFixture();
    const { response, res } = await app.call("GET", `/api/auth/logout?callbackUrl=https://app.example/bye&${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, {
      cookie: `${await sessionCookie(sessionFixture("ada", 1))}; ${csrf.cookie}`,
    });
    expect(response?.headers.get("location")).toBe("/bye");
    expect(res.headers.get("set-cookie")).toMatch(/light_auth_session=;.*Max-Age=0/);
    expect(app.users.has("ada")).toBe(false);
  });

  it("never redirects outside the application, even without session", async () => {
    const { response } = await app.call("GET", "/api/auth/logout?callbackUrl=//evil.example/phishing");
    expect(response?.headers.get("location")).toBe("/");
  });
});

describe("credentials login", () => {
  const credentialsLogin = async (headers: Record<string, string>, cookie: string, body: Record<string, unknown>) =>
    app.call("POST", "/api/auth/credentials/login", { cookie, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

  it("rejects a request without the CSRF header", async () => {
    const csrf = await csrfFixture();
    const { error } = await credentialsLogin({}, csrf.cookie, { email: "c@example.com", password: "good-password" });
    expect(error).toBe("Invalid CSRF token");
  });

  it("logs in with the CSRF header and returns a sanitized callback URL", async () => {
    const csrf = await csrfFixture();
    const { response, res } = await credentialsLogin({ [CSRF_HEADER_NAME]: csrf.token }, csrf.cookie, {
      email: "c@example.com",
      password: "good-password",
      callbackUrl: "https://evil.example",
    });
    expect(await response?.json()).toMatchObject({ success: true, callbackUrl: "/" });
    expect((await readSessionCookie(res))?.providerUserId).toBe("c-1");
  });

  it("rejects invalid credentials", async () => {
    const csrf = await csrfFixture();
    const { response, res } = await credentialsLogin({ [CSRF_HEADER_NAME]: csrf.token }, csrf.cookie, { email: "c@example.com", password: "wrong" });
    expect(response?.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});

describe("origin check", () => {
  it("rejects cross-origin POST requests", async () => {
    const { error } = await app.call("POST", "/api/auth/session", { headers: { host: "app.example", origin: "https://evil.example" } });
    expect(error).toMatch(/origin/i);
  });

  it("accepts same-origin POST requests", async () => {
    const { error, response } = await app.call("POST", "/api/auth/session", { headers: { host: "app.example", origin: "https://app.example" } });
    expect(error).toBeUndefined();
    expect(response?.status).toBe(200);
  });
});
