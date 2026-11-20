import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFetchSessionClientFunction,
  createFetchUserClientFunction,
  createSigninClientFunction,
  createSignoutClientFunction,
  credentialsLogin,
  credentialsRegister,
  credentialsResetPasswordConfirm,
  credentialsResetPasswordRequest,
} from "../src/client";
import { createCredentialsProvider, createOAuth2Provider, CSRF_COOKIE_NAME, CSRF_HEADER_NAME, internalFetch, LightAuthHttpError } from "../src";
import { APP_ORIGIN, createTestApp, sessionCookie, sessionFixture, type TestApp } from "./helpers/app";
import { createBrowser } from "./helpers/browser";

let app: TestApp;
let browser: ReturnType<typeof createBrowser>;

beforeEach(() => {
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
        registerUser: async (email) => (email === "taken@example.com" ? null : { sub: "c-2", email, name: "New" }),
        requestPasswordReset: async () => true,
        resetPassword: async (token) => token === "valid-token",
      }),
    ],
  });
  browser = createBrowser(app);
});

describe("credentials client", () => {
  it("logs in, sending back the CSRF token in a header", async () => {
    const result = await credentialsLogin({ config: app.config, email: "c@example.com", password: "good-password" });

    expect(result).toMatchObject({ success: true, session: { email: "c@example.com", providerName: "credentials" } });
    const csrfTokenInCookie = browser.jar.get(CSRF_COOKIE_NAME)?.value.split(".")[1];
    expect(browser.requests.at(-1)?.headers.get(CSRF_HEADER_NAME)).toBe(csrfTokenInCookie);
    expect(browser.jar.get("light_auth_session")?.httpOnly).toBe(true);
  });

  it("returns the error message of the server", async () => {
    expect(await credentialsLogin({ config: app.config, email: "c@example.com", password: "wrong" })).toEqual({ success: false, error: "Invalid email or password" });
    expect(await credentialsRegister({ config: app.config, email: "taken@example.com", password: "p" })).toEqual({
      success: false,
      error: "Registration failed. User may already exist.",
    });
    expect(await credentialsResetPasswordConfirm({ config: app.config, token: "expired", newPassword: "n" })).toEqual({ success: false, error: "Invalid or expired reset token" });
  });

  it("registers a user", async () => {
    expect(await credentialsRegister({ config: app.config, email: "new@example.com", password: "p", name: "New" })).toMatchObject({
      success: true,
      session: { email: "new@example.com" },
      message: "User registered and logged in successfully",
    });
  });

  it("requests and confirms a password reset", async () => {
    expect(await credentialsResetPasswordRequest({ config: app.config, email: "c@example.com" })).toMatchObject({ success: true });
    expect(await credentialsResetPasswordConfirm({ config: app.config, token: "valid-token", newPassword: "n" })).toMatchObject({ success: true });
  });

  it("refuses to run on the server", async () => {
    vi.unstubAllGlobals();
    const results = await Promise.all([
      credentialsLogin({ config: app.config, email: "c@example.com", password: "p" }),
      credentialsRegister({ config: app.config, email: "c@example.com", password: "p" }),
      credentialsResetPasswordRequest({ config: app.config, email: "c@example.com" }),
      credentialsResetPasswordConfirm({ config: app.config, token: "t", newPassword: "n" }),
    ]);
    for (const result of results) expect(result).toMatchObject({ success: false, error: expect.stringMatching(/server side/) });
  });
});

describe("light auth client", () => {
  it("signs in through the login endpoint, with the CSRF token in the URL", async () => {
    await createSigninClientFunction(app.config)({ providerName: "test", callbackUrl: "/profile" });

    const href = new URL(browser.window.location.href, APP_ORIGIN);
    expect(href.pathname).toBe("/api/auth/login/test");
    expect(href.searchParams.get("callbackUrl")).toBe("/profile");

    // the browser follows the navigation, with its cookies
    const { response } = await app.call("GET", `${href.pathname}${href.search}`, { cookie: browser.cookieHeader() });
    expect(response?.headers.get("location")).toMatch(/^https:\/\/idp\.test\/authorize\?/);
  });

  it("signs out through the logout endpoint, with the CSRF token in the URL", async () => {
    app.users.set("ada", { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada" });
    browser.setServerCookie(await sessionCookie(sessionFixture("ada", 1)));
    await createSignoutClientFunction(app.config)({ revokeToken: false, callbackUrl: "/bye" });

    const href = new URL(browser.window.location.href, APP_ORIGIN);
    expect(href.searchParams.get("revokeToken")).toBe("false");
    const { response } = await app.call("GET", `${href.pathname}${href.search}`, { cookie: browser.cookieHeader() });
    expect(response?.headers.get("location")).toBe("/bye");
    expect(app.users.has("ada")).toBe(false);
  });

  it("reads the session and the user, without the OAuth tokens", async () => {
    app.users.set("ada", { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada", refreshToken: "secret", accessTokenExpiresAt: new Date(Date.now() + 3600_000) });
    expect(await createFetchSessionClientFunction(app.config)()).toBeNull();

    browser.setServerCookie(await sessionCookie(sessionFixture("ada", 1)));
    expect((await createFetchSessionClientFunction(app.config)())?.providerUserId).toBe("ada");

    const user = await createFetchUserClientFunction(app.config)();
    expect(user?.email).toBe("ada@example.com");
    expect(user).not.toHaveProperty("refreshToken");
    expect(await createFetchUserClientFunction(app.config)({ providerUserId: "someone-else" })).toBeNull();
  });

  it("refuses to run on the server", async () => {
    vi.unstubAllGlobals();
    await expect(createSigninClientFunction(app.config)()).rejects.toThrow(/server side/);
    await expect(createSignoutClientFunction(app.config)()).rejects.toThrow(/server side/);
    expect(await createFetchSessionClientFunction(app.config)()).toBeNull();
    expect(await createFetchUserClientFunction(app.config)()).toBeNull();
  });
});

describe("internalFetch in the browser", () => {
  const respond = (response: Response | Error) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (response instanceof Error) throw response;
        expect(input instanceof Request ? input.url : String(input)).toBe(`${APP_ORIGIN}/api/auth/test`);
        return response;
      })
    );
  const call = () => internalFetch<Record<string, unknown>>({ config: { basePath: "/api/auth" }, endpoint: "/api/auth/test", method: "POST" });

  it.each<[string, Response, unknown]>([
    ["JSON", Response.json({ a: 1 }), { a: 1 }],
    ["text/plain JSON", new Response('{"a":1}', { headers: { "content-type": "text/plain" } }), { a: 1 }],
    ["form-urlencoded", new Response("a=1&b=2", { headers: { "content-type": "application/x-www-form-urlencoded" } }), { a: "1", b: "2" }],
    ["no content type", new Response(null), null],
  ])("parses a %s response of a relative endpoint", async (_label, response, expected) => {
    respond(response);
    expect(await call()).toEqual(expected);
  });

  it("returns binary responses as a Blob", async () => {
    respond(new Response(new Uint8Array([1, 2]), { headers: { "content-type": "application/octet-stream" } }));
    expect(await call()).toBeInstanceOf(Blob);
  });

  it("raises an HTTP error with the JSON body", async () => {
    respond(Response.json({ error: "Forbidden" }, { status: 403 }));
    const error = await call().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LightAuthHttpError);
    expect(error).toMatchObject({ status: 403, body: { error: "Forbidden" } });
  });

  it("raises network errors", async () => {
    respond(new Error("offline"));
    await expect(call()).rejects.toThrow(/Request failed with error/);
  });
});
