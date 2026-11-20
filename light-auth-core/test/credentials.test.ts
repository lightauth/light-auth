import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCredentialsProvider, CSRF_HEADER_NAME, type LightAuthCredentialsProvider, type LightAuthUserClaims } from "../src";
import { createTestApp, csrfFixture, forbidNetwork, readSessionCookie, type TestApp } from "./helpers/app";

const claims: LightAuthUserClaims = { sub: "c-1", email: "cred@example.com", name: "Cred", picture: "https://avatar.example/c-1", role: "admin" };

let provider: LightAuthCredentialsProvider;
let app: TestApp;

const createApp = (overrides: Partial<LightAuthCredentialsProvider> = {}) => {
  provider = createCredentialsProvider({
    providerName: "credentials",
    verifyCredentials: vi.fn(async (_email: string, password: string) => (password === "good-password" ? claims : null)),
    registerUser: vi.fn(async (email: string) => (email === "taken@example.com" ? null : { ...claims, email })),
    requestPasswordReset: vi.fn(async () => true),
    resetPassword: vi.fn(async (token: string) => token === "valid-token"),
    ...overrides,
  });
  app = createTestApp({ providers: [provider], onLogin: vi.fn(), onRegister: vi.fn(), onPasswordReset: vi.fn(), onError: vi.fn() });
  return app;
};

async function post(path: string, body: Record<string, unknown>) {
  const csrf = await csrfFixture();
  return app.call("POST", `/api/auth/credentials/${path}`, {
    cookie: csrf.cookie,
    headers: { "content-type": "application/json", [CSRF_HEADER_NAME]: csrf.token },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  forbidNetwork();
  createApp();
});

describe("credentials login", () => {
  it("creates the session with the custom claims and stores the user", async () => {
    const { response, res } = await post("login", { email: "cred@example.com", password: "good-password" });
    expect(await response?.json()).toMatchObject({ success: true, session: { email: "cred@example.com", providerName: "credentials" } });
    expect(await readSessionCookie(res)).toMatchObject({ providerUserId: "c-1", role: "admin" });
    expect(app.users.get("c-1")?.picture).toBe("https://avatar.example/c-1");
    expect(app.config.onLogin).toHaveBeenCalledOnce();
  });

  it("requires the email and the password", async () => {
    const { response } = await post("login", { email: "cred@example.com" });
    expect(response?.status).toBe(400);
  });

  it("answers 500 and raises onError when the verification fails", async () => {
    createApp({ verifyCredentials: vi.fn().mockRejectedValue(new Error("database down")) });
    const { response } = await post("login", { email: "cred@example.com", password: "good-password" });
    expect(response?.status).toBe(500);
    expect(await response?.json()).toEqual({ error: "Authentication failed" });
    expect(app.config.onError).toHaveBeenCalledWith(expect.any(Error), "login");
  });
});

describe("credentials register", () => {
  it("registers and signs in the user", async () => {
    const { response, res } = await post("register", { email: "new@example.com", password: "p4ssword", name: "New", additionalData: { plan: "pro" } });
    expect(response?.status).toBe(201);
    expect(provider.registerUser).toHaveBeenCalledWith("new@example.com", "p4ssword", { name: "New", plan: "pro" });
    expect((await readSessionCookie(res))?.email).toBe("new@example.com");
    expect(app.users.has("c-1")).toBe(true);
    expect(app.config.onRegister).toHaveBeenCalledOnce();
  });

  it("registers without signing in when autoLogin is false", async () => {
    const { response, res } = await post("register", { email: "new@example.com", password: "p4ssword", autoLogin: false });
    expect(response?.status).toBe(201);
    expect(await response?.json()).toMatchObject({ success: true, user: { email: "new@example.com" } });
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  it.each<[string, Record<string, unknown>, number]>([
    ["requires the email and the password", { email: "new@example.com" }, 400],
    ["answers 409 when the provider refuses the user", { email: "taken@example.com", password: "p4ssword" }, 409],
  ])("%s", async (_label, body, status) => {
    const { response } = await post("register", body);
    expect(response?.status).toBe(status);
  });

  it("answers 501 when the provider does not support registration", async () => {
    createApp({ registerUser: undefined });
    const { response } = await post("register", { email: "new@example.com", password: "p4ssword" });
    expect(response?.status).toBe(501);
  });

  it("answers 500 and raises onError when the registration fails", async () => {
    createApp({ registerUser: vi.fn().mockRejectedValue(new Error("database down")) });
    const { response } = await post("register", { email: "new@example.com", password: "p4ssword" });
    expect(response?.status).toBe(500);
    expect(app.config.onError).toHaveBeenCalledWith(expect.any(Error), "register");
  });
});

describe("lifecycle hooks", () => {
  it.each([
    ["login", { email: "cred@example.com", password: "good-password" }],
    ["register", { email: "new@example.com", password: "p4ssword" }],
  ])("%s lets the hooks complete the session and the user before they are saved", async (path, body) => {
    app = createTestApp({
      providers: [provider],
      onSessionSaving: (session) => ({ ...session, tenant: "acme" }),
      onSessionSaved: vi.fn(),
      onUserSaving: (user) => ({ ...user, tenant: "acme" }),
      onUserSaved: vi.fn(),
    });
    const { res } = await post(path, body);

    expect(await readSessionCookie(res)).toMatchObject({ providerUserId: "c-1", tenant: "acme" });
    expect(app.users.get("c-1")).toMatchObject({ tenant: "acme" });
    expect(app.config.onSessionSaved).toHaveBeenCalledWith(expect.objectContaining({ tenant: "acme" }), expect.anything());
    expect(app.config.onUserSaved).toHaveBeenCalledWith(expect.objectContaining({ tenant: "acme" }), expect.anything());
  });
});

describe("password reset", () => {
  it("always answers the same message to the reset request, without revealing if the email exists", async () => {
    const { response } = await post("reset-password/request", { email: "unknown@example.com" });
    expect(await response?.json()).toEqual({ success: true, message: "If an account with that email exists, a password reset link has been sent." });
    expect(app.config.onPasswordReset).toHaveBeenCalledWith("unknown@example.com");

    createApp({ requestPasswordReset: vi.fn().mockRejectedValue(new Error("smtp down")) });
    expect((await (await post("reset-password/request", { email: "unknown@example.com" })).response?.json()).success).toBe(true);
  });

  it.each<[string, Partial<LightAuthCredentialsProvider>, Record<string, unknown>, number]>([
    ["requires the email", {}, {}, 400],
    ["answers 501 when not supported", { requestPasswordReset: undefined }, { email: "a@example.com" }, 501],
  ])("reset request %s", async (_label, overrides, body, status) => {
    createApp(overrides);
    expect((await post("reset-password/request", body)).response?.status).toBe(status);
  });

  it("resets the password with a valid token", async () => {
    const { response } = await post("reset-password/confirm", { token: "valid-token", newPassword: "n3w" });
    expect(await response?.json()).toMatchObject({ success: true });
    expect(provider.resetPassword).toHaveBeenCalledWith("valid-token", "n3w");
  });

  it.each<[string, Partial<LightAuthCredentialsProvider>, Record<string, unknown>, number]>([
    ["rejects an invalid token", {}, { token: "expired-token", newPassword: "n3w" }, 400],
    ["requires the token and the password", {}, { token: "valid-token" }, 400],
    ["answers 501 when not supported", { resetPassword: undefined }, { token: "valid-token", newPassword: "n3w" }, 501],
    ["answers 500 when the reset fails", { resetPassword: vi.fn().mockRejectedValue(new Error("database down")) }, { token: "valid-token", newPassword: "n3w" }, 500],
  ])("reset confirmation %s", async (_label, overrides, body, status) => {
    createApp(overrides);
    expect((await post("reset-password/confirm", body)).response?.status).toBe(status);
  });
});

describe("credentials endpoints with an OAuth provider", () => {
  it.each(["login", "register", "reset-password/request", "reset-password/confirm"])("%s fails when the provider named credentials is not a credentials provider", async (path) => {
    app = createTestApp({
      providers: [{ type: "oauth", providerName: "credentials", clientId: "id", authorizationEndpoint: "https://idp.test/a", tokenEndpoint: "https://idp.test/t" }],
    });
    const { response } = await post(path, { email: "a@example.com", password: "p", token: "t", newPassword: "n" });
    expect(response?.status).toBe(path === "reset-password/request" ? 200 : 500);
  });
});
