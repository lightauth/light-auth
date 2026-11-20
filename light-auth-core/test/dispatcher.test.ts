import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkConfig,
  createCredentialsProvider,
  createHttpHandlerFunction,
  createLightAuthRateLimiter,
  createOAuth2Provider,
  CSRF_TOKEN_PARAM_NAME,
  type LightAuthConfig,
  type LightAuthOAuthProvider,
} from "../src";
import { createTestApp, csrfFixture, forbidNetwork, sessionCookie, sessionFixture, TEST_SECRET } from "./helpers/app";

const oauthProvider = (revokeToken?: LightAuthOAuthProvider["revokeToken"]) =>
  createOAuth2Provider({
    providerName: "test",
    clientId: "test-client",
    clientSecret: "secret",
    authorizationEndpoint: "https://idp.test/authorize",
    tokenEndpoint: "https://idp.test/token",
    revokeToken,
  });
const credentialsProvider = createCredentialsProvider({ providerName: "credentials", verifyCredentials: () => null });

beforeEach(() => {
  forbidNetwork();
});

describe("routing", () => {
  it("throws on the base path itself", async () => {
    const { error } = await createTestApp().call("POST", "/api/auth");
    expect(error).toMatch(/Not enough path segments/);
  });

  it("answers nothing on unknown routes and methods", async () => {
    const app = createTestApp();
    expect((await app.call("POST", "/api/auth/unknown")).response).toBeNull();
    expect((await app.call("GET", "/api/auth/session")).response).toBeNull();
  });

  it("rejects an unknown provider", async () => {
    const csrf = await csrfFixture();
    const { error } = await createTestApp().call("GET", `/api/auth/login/unknown?${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
    expect(error).toMatch(/Provider unknown not found/);
  });

  it("refuses the redirect flow for a credentials provider", async () => {
    const csrf = await csrfFixture();
    const app = createTestApp({ providers: [credentialsProvider] });
    const { error } = await app.call("GET", `/api/auth/login/credentials?${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
    expect(error).toMatch(/POST to \/credentials\/login/);
  });

  it("refuses the OAuth callback for a credentials provider", async () => {
    const app = createTestApp({ providers: [credentialsProvider] });
    const { response } = await app.call("GET", "/api/auth/callback/credentials?code=c&state=s");
    expect(response?.headers.get("location")).toBe("/");
    expect(String(app.errors[0])).toMatch(/should not use callback handler/);
  });

  it("answers the CSRF endpoint with a signed token", async () => {
    const { response } = await createTestApp().call("POST", "/api/auth/csrf");
    const { csrfToken, csrfTokenHash } = await response?.json();
    expect(csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(csrfTokenHash).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("answers with the rate limiter response", async () => {
    const app = createTestApp({ rateLimiter: createLightAuthRateLimiter({ maxRequestsPerTimeWindowsMs: 1, timeWindowMs: 60_000 }) });
    await app.call("POST", "/api/auth/session");
    const { response } = await app.call("POST", "/api/auth/session");
    expect(response?.status).toBe(429);
    expect(await response?.json()).toEqual({ message: "Too many requests. Please try again later." });
  });

  it.each([
    ["router", { router: undefined }],
    ["env", { env: undefined }],
    ["basePath", { basePath: undefined }],
  ])("requires the %s", async (option, overrides) => {
    const app = createTestApp();
    const handler = createHttpHandlerFunction({ ...app.config, ...overrides });
    await expect(handler({ req: new Request("https://app.example/api/auth/session", { method: "POST" }) })).rejects.toThrow(new RegExp(`${option} is required`));
  });
});

describe("logout options", () => {
  const signedInApp = (revokeToken: LightAuthOAuthProvider["revokeToken"], onLogout = vi.fn()) => {
    const app = createTestApp({ providers: [oauthProvider(revokeToken)], onLogout });
    app.users.set("ada", { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada", accessToken: "access", refreshToken: "refresh" });
    return app;
  };
  const logout = async (app: ReturnType<typeof createTestApp>, query: string) => {
    const csrf = await csrfFixture();
    return app.call("GET", `/api/auth/logout?${query}&${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: `${await sessionCookie(sessionFixture("ada", 1))}; ${csrf.cookie}` });
  };

  it.each(["revokeToken=true", "revokeToken=1", "revokeToken=TRUE"])("revokes the tokens with %s", async (query) => {
    const revokeToken = vi.fn<NonNullable<LightAuthOAuthProvider["revokeToken"]>>(async () => {});
    await logout(signedInApp(revokeToken), query);
    expect(revokeToken.mock.calls.map(([context]) => context)).toEqual([
      { token: "refresh", tokenTypeHint: "refresh_token" },
      { token: "access", tokenTypeHint: "access_token" },
    ]);
  });

  it.each(["revokeToken=false", "other=1"])("keeps the tokens with %s", async (query) => {
    const revokeToken = vi.fn(async () => {});
    await logout(signedInApp(revokeToken), query);
    expect(revokeToken).not.toHaveBeenCalled();
  });

  it("logs out even when the revocation or the onLogout hook fail", async () => {
    const onLogout = vi.fn().mockRejectedValue(new Error("hook failed"));
    const app = signedInApp(vi.fn().mockRejectedValue(new Error("provider down")), onLogout);
    const { response, res } = await logout(app, "revokeToken=true");
    expect(response?.status).toBe(302);
    expect(onLogout).toHaveBeenCalledWith(expect.objectContaining({ providerUserId: "ada" }), "test");
    expect(res.headers.get("set-cookie")).toMatch(/Max-Age=0/);
  });
});

describe("checkConfig", () => {
  const config = (): LightAuthConfig => createTestApp().config;

  it.each<[string, Partial<LightAuthConfig>, RegExp]>([
    ["the env", { env: undefined }, /env is required/],
    ["the secret", { env: {} }, /LIGHT_AUTH_SECRET_VALUE is required/],
    ["a provider", { providers: [] }, /At least one provider/],
    ["a router", { router: undefined }, /router is required/],
    ["a session store", { sessionStore: undefined }, /sessionStore is required/],
  ])("requires %s", (_label, overrides, error) => {
    expect(() => checkConfig({ ...config(), ...overrides })).toThrow(error);
  });

  it("fills the defaults and selects the requested provider", () => {
    const checked = checkConfig({ ...config(), basePath: undefined, sessionName: undefined, providers: [oauthProvider(), credentialsProvider] }, "CREDENTIALS");
    expect(checked).toMatchObject({ basePath: "/api/auth", sessionName: "light_auth_session" });
    expect(checked.provider.providerName).toBe("credentials");
    expect(checkConfig({ ...config(), env: { LIGHT_AUTH_SECRET_VALUE: TEST_SECRET } }).provider.providerName).toBe("test");
  });
});
