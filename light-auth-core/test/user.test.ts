import { beforeEach, describe, expect, it } from "vitest";
import { getUserDirect, type LightAuthUser } from "../src";
import { createTestApp, forbidNetwork, sessionCookie, sessionFixture, type TestApp } from "./helpers/app";

const userFixture = (providerUserId: string): LightAuthUser => ({
  providerUserId,
  providerName: "test",
  email: `${providerUserId}@example.com`,
  name: providerUserId,
  accessToken: `${providerUserId}-access-token`,
  refreshToken: `${providerUserId}-refresh-token`,
  accessTokenExpiresAt: new Date(Date.now() + 3600_000),
});

let app: TestApp;

beforeEach(() => {
  forbidNetwork();
  app = createTestApp();
  app.users.set("victim", userFixture("victim"));
  app.users.set("attacker", userFixture("attacker"));
});

describe("POST /user", () => {
  it("returns null without session, even when an id is given", async () => {
    const { response } = await app.call("POST", "/api/auth/user/victim");
    expect(await response?.json()).toBeNull();
  });

  it("forbids reading another user", async () => {
    const { response } = await app.call("POST", "/api/auth/user/victim", { cookie: await sessionCookie(sessionFixture("attacker", 1)) });
    expect(response?.status).toBe(403);
    expect(JSON.stringify(await response?.json())).not.toContain("victim-refresh-token");
  });

  it("returns the user of the session without its OAuth tokens", async () => {
    const { response } = await app.call("POST", "/api/auth/user", { cookie: await sessionCookie(sessionFixture("victim", 1)) });
    const user = await response?.json();
    expect(user.providerUserId).toBe("victim");
    expect(user).not.toHaveProperty("accessToken");
    expect(user).not.toHaveProperty("refreshToken");
    expect(user).not.toHaveProperty("accessTokenExpiresAt");
  });

  it("accepts the id of the session user in the path", async () => {
    const { response } = await app.call("POST", "/api/auth/user/victim", { cookie: await sessionCookie(sessionFixture("victim", 1)) });
    expect((await response?.json()).providerUserId).toBe("victim");
  });

  it("returns null for an expired session", async () => {
    const { response } = await app.call("POST", "/api/auth/user", { cookie: await sessionCookie(sessionFixture("victim", 31)) });
    expect(await response?.json()).toBeNull();
  });
});

describe("getUserDirect (server)", () => {
  it("returns the user of the current session, tokens included", async () => {
    const req = new Request("https://app.example/", { headers: { cookie: await sessionCookie(sessionFixture("victim", 1)) } });
    const user = await getUserDirect({ config: app.config, req });
    expect(user?.refreshToken).toBe("victim-refresh-token");
  });

  it("returns null when the session is expired", async () => {
    const req = new Request("https://app.example/", { headers: { cookie: await sessionCookie(sessionFixture("victim", 31)) } });
    expect(await getUserDirect({ config: app.config, req })).toBeNull();
  });

  it("reads any user for trusted server code", async () => {
    expect((await getUserDirect({ config: app.config, providerUserId: "attacker" }))?.providerUserId).toBe("attacker");
  });

  it("returns null when the user store fails", async () => {
    app.config.userAdapter!.getUser = async () => {
      throw new Error("database down");
    };
    expect(await getUserDirect({ config: app.config, providerUserId: "victim" })).toBeNull();
  });
});
