import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFetchSessionServerFunction,
  createFetchUserServerFunction,
  createOAuth2Provider,
  createSetSessionServerFunction,
  createSetUserServerFunction,
  createSigninServerFunction,
  createSignoutServerFunction,
} from "../src";
import { createTestApp, forbidNetwork, sessionCookie, sessionFixture, type TestApp } from "./helpers/app";

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
    ],
  });
});

const request = async (cookie?: string) => new Request("https://app.example/page", { headers: cookie ? { cookie } : {} });

describe("signIn (server)", () => {
  it("redirects to the provider without CSRF token, the call coming from trusted server code", async () => {
    const signIn = createSigninServerFunction(app.config);
    const res = new Response(null);
    const response = (await signIn({ providerName: "test", callbackUrl: "https://evil.example", req: await request(), res })) as Response;

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/^https:\/\/idp\.test\/authorize\?/);
    expect(app.writtenCookies.find((c) => c.name === "test_light_auth_callback_url")?.value).toBe("/");
  });
});

describe("signOut (server)", () => {
  it("deletes the session and the user, then redirects", async () => {
    app.users.set("ada", { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada" });
    const res = new Response(null);
    const signOut = createSignoutServerFunction(app.config);

    const response = (await signOut({ callbackUrl: "/bye", req: await request(await sessionCookie(sessionFixture("ada", 1))), res })) as Response;
    expect(response.headers.get("location")).toBe("/bye");
    expect(res.headers.get("set-cookie")).toMatch(/light_auth_session=;.*Max-Age=0/);
    expect(app.users.has("ada")).toBe(false);
  });

  it("only redirects when there is no session", async () => {
    const response = (await createSignoutServerFunction(app.config)({ req: await request(), res: new Response(null) })) as Response;
    expect(response.headers.get("location")).toBe("/");
  });
});

describe("user and session server functions", () => {
  it("reads a user by id, or the user of the session", async () => {
    app.users.set("ada", { providerUserId: "ada", providerName: "test", email: "ada@example.com", name: "Ada" });
    const getUser = createFetchUserServerFunction(app.config);
    expect((await getUser({ providerUserId: "ada" }))?.email).toBe("ada@example.com");
    expect((await getUser({ req: await request(await sessionCookie(sessionFixture("ada", 1))) }))?.email).toBe("ada@example.com");
  });

  it("returns null when there is nothing to save", async () => {
    expect(await createSetSessionServerFunction(app.config)()).toBeNull();
    expect(await createSetUserServerFunction(app.config)()).toBeNull();
  });

  it("returns null when the session store fails", async () => {
    const getAuthSession = createFetchSessionServerFunction(app.config);
    // the default session store requires the request
    expect(await getAuthSession({})).toBeNull();
  });

  it("returns null when the user cannot be saved", async () => {
    app.config.userAdapter = undefined;
    const saved = await createSetUserServerFunction(app.config)({ user: { providerUserId: "ada", providerName: "test", email: "a@example.com", name: "A" } });
    expect(saved).toBeNull();
  });
});

describe("server functions called in the browser", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("refuse to run", async () => {
    await expect(createSigninServerFunction(app.config)()).rejects.toThrow(/client side/);
    await expect(createSignoutServerFunction(app.config)()).rejects.toThrow(/client side/);
    expect(await createFetchSessionServerFunction(app.config)()).toBeNull();
    expect(await createSetSessionServerFunction(app.config)({ session: sessionFixture("ada", 1) })).toBeNull();
    expect(await createSetUserServerFunction(app.config)({ user: { providerUserId: "ada", providerName: "test", email: "a@example.com", name: "A" } })).toBeNull();
    expect(await createFetchUserServerFunction(app.config)({ providerUserId: "ada" })).toBeNull();
  });
});
