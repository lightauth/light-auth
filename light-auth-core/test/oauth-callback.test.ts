import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDiscordProvider,
  createMicrosoftEntraIdProvider,
  createOAuth2Provider,
  createOidcProvider,
  CSRF_TOKEN_PARAM_NAME,
  getUserDirect,
  type LightAuthProvider,
} from "../src";
import { createTestApp, csrfFixture, readSessionCookie, type TestApp } from "./helpers/app";
import { createMockProvider, type AuthorizeOptions, type MockProvider, type MockUser } from "./helpers/mock-provider";

const ORIGIN = "https://idp.oauth.test";
const ada: MockUser = { sub: "u-1", email: "ada@example.com", name: "Ada Lovelace" };

let mock: MockProvider;
let app: TestApp;

const providers = (): LightAuthProvider[] => [
  createOidcProvider({
    providerName: "oidc",
    issuer: ORIGIN,
    clientId: "oidc-client",
    clientSecret: "secret:oidc-client",
    searchParams: new Map([
      ["prompt", "consent"],
      ["state", "attacker-state"],
    ]),
  }),
  createOAuth2Provider({
    providerName: "oauth2",
    clientId: "oauth2-client",
    clientSecret: "secret:oauth2-client",
    clientAuthentication: "client_secret_post",
    authorizationEndpoint: `${ORIGIN}/oauth2/authorize`,
    tokenEndpoint: `${ORIGIN}/oauth2/token`,
    userInfoEndpoint: `${ORIGIN}/oauth2/user`,
    redirectUri: "https://app.example/api/auth/callback/oauth2",
    getProfile: async ({ fetchUserInfo, fetchResource }) => {
      const user = await fetchUserInfo();
      const emails = (await fetchResource(`${ORIGIN}/oauth2/emails`)) as { email: string; primary: boolean }[];
      return { sub: String(user.id), email: emails.find((e) => e.primary)!.email, name: String(user.login) };
    },
  }),
  createDiscordProvider({
    clientId: "discord-client",
    clientSecret: "secret:discord-client",
    authorizationEndpoint: `${ORIGIN}/oauth2/authorize`,
    tokenEndpoint: `${ORIGIN}/oauth2/token`,
    userInfoEndpoint: `${ORIGIN}/oauth2/user`,
    revocationEndpoint: `${ORIGIN}/revoke`,
  }),
  createMicrosoftEntraIdProvider({
    clientId: "entra-client",
    clientSecret: "secret:entra-client",
    authorizationEndpoint: `${ORIGIN}/authorize`,
    tokenEndpoint: `${ORIGIN}/token`,
    jwksUri: `${ORIGIN}/jwks`,
  }),
  createOidcProvider({
    providerName: "formpost",
    issuer: ORIGIN,
    clientId: "formpost-client",
    clientSecret: "secret:formpost-client",
    clientAuthentication: "client_secret_post",
    responseMode: "form_post",
    pkce: false,
  }),
];

/**
 * Plays a full sign in: login (with the CSRF token), authorization at the mock provider, then callback with the flow cookies.
 */
async function signIn(
  providerName: string,
  authorizeOptions: AuthorizeOptions,
  options: { tamperCookies?: (cookie: string) => string; tamperState?: string; formPost?: boolean } = {}
) {
  const csrf = await csrfFixture();
  const login = await app.call("GET", `/api/auth/login/${providerName}?callbackUrl=/dashboard&${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
  expect(login.error).toBeUndefined();

  const authorizationUrl = new URL(login.response!.headers.get("location")!);
  const flowCookies = app.writtenCookies.filter((cookie) => cookie.maxAge !== 0).map((cookie) => ({ ...cookie }));
  const { code, state } = mock.authorize(authorizationUrl, authorizeOptions);

  let cookie = flowCookies.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
  if (options.tamperCookies) cookie = options.tamperCookies(cookie);
  const parameters = new URLSearchParams({ code, state: options.tamperState ?? state });

  const errorsBefore = app.errors.length;
  const callback = options.formPost
    ? await app.call("POST", `/api/auth/callback/${providerName}`, {
        cookie,
        headers: { "content-type": "application/x-www-form-urlencoded", host: "app.example", origin: "https://appleid.apple.com" },
        body: parameters.toString(),
      })
    : await app.call("GET", `/api/auth/callback/${providerName}?${parameters}`, { cookie });

  const sessionCookieValue = callback.res.headers.get("set-cookie")?.match(/light_auth_session=([^;]+)/)?.[1];

  return {
    authorizationUrl,
    flowCookies,
    code,
    cookie,
    callback,
    callbackCookies: [...app.writtenCookies],
    session: await readSessionCookie(callback.res),
    /** session cookie set by the callback, as sent back by the browser */
    sessionCookie: sessionCookieValue ? `light_auth_session=${sessionCookieValue}` : null,
    errors: app.errors.slice(errorsBefore).map((error) => (error instanceof Error ? error.message : String(error))),
  };
}

beforeAll(async () => {
  mock = await createMockProvider(ORIGIN);
});

beforeEach(() => {
  mock.reset();
  vi.stubGlobal("fetch", mock.fetch);
  app = createTestApp({
    providers: providers(),
    onTokenRefresh: vi.fn(),
    onSessionSaving: (session, tokens) => {
      const givenName = tokens?.idTokenClaims?.given_name;
      return typeof givenName === "string" ? { ...session, firstName: givenName } : session;
    },
  });
});

describe("OpenID Connect sign in", () => {
  it("builds the authorization request from the discovery document", async () => {
    const { authorizationUrl } = await signIn("oidc", { user: ada });
    const params = authorizationUrl.searchParams;

    expect(`${authorizationUrl.origin}${authorizationUrl.pathname}`).toBe(`${ORIGIN}/authorize`);
    expect(params.get("response_type")).toBe("code");
    expect(params.get("client_id")).toBe("oidc-client");
    expect(params.get("redirect_uri")).toBe("https://app.example/api/auth/callback/oidc");
    expect(params.get("scope")).toBe("openid profile email");
    expect(params.get("code_challenge_method")).toBe("S256");
    expect(params.get("code_challenge")).toBeTruthy();
    expect(params.get("nonce")).toBeTruthy();
  });

  it("lets searchParams add parameters, but not override the protocol ones", async () => {
    const { authorizationUrl } = await signIn("oidc", { user: ada });
    expect(authorizationUrl.searchParams.get("prompt")).toBe("consent");
    expect(authorizationUrl.searchParams.get("state")).not.toBe("attacker-state");
  });

  it("keeps the state, the PKCE verifier, the nonce and the callback URL in short-lived httpOnly cookies", async () => {
    const { flowCookies } = await signIn("oidc", { user: ada });
    for (const name of ["state", "code_verifier", "nonce", "callback_url"]) {
      expect(flowCookies).toContainEqual(expect.objectContaining({ name: `oidc_light_auth_${name}`, httpOnly: true, sameSite: "lax", maxAge: 600 }));
    }
  });

  it("creates the session from the validated id_token and stores the tokens", async () => {
    const { session, callback, errors } = await signIn("oidc", { user: ada });

    expect(errors).toEqual([]);
    expect(session).toMatchObject({ providerUserId: "u-1", email: "ada@example.com", name: "Ada Lovelace", providerName: "oidc" });
    expect(callback.response?.headers.get("location")).toBe("/dashboard");

    const user = app.users.get("u-1");
    expect(user?.accessToken).toBeTruthy();
    expect(user?.refreshToken).toBeTruthy();
    expect(new Date(user!.accessTokenExpiresAt!).getTime()).toBeGreaterThan(Date.now() + 3500_000);
    expect(mock.tokenRequests.at(-1)).toMatchObject({ grantType: "authorization_code", method: "client_secret_basic" });
  });

  it("gives the validated id_token claims to the hooks", async () => {
    const { session } = await signIn("oidc", { user: ada });
    expect(session?.firstName).toBe("Ada");
  });

  it("deletes the flow cookies after the callback", async () => {
    const { callbackCookies } = await signIn("oidc", { user: ada });
    for (const name of ["state", "code_verifier", "nonce", "callback_url"]) {
      expect(callbackCookies).toContainEqual(expect.objectContaining({ name: `oidc_light_auth_${name}`, maxAge: 0 }));
    }
  });
});

describe("tampered authorization responses are rejected", () => {
  it.each<[string, Partial<AuthorizeOptions>, RegExp]>([
    ["an id_token with another nonce", { idTokenOverrides: { nonce: "attacker-nonce" } }, /nonce/],
    ["an id_token issued for another client", { idTokenOverrides: { aud: "another-client" } }, /aud/],
    ["an id_token with a forged signature", { badSignature: true }, /signature/],
    ["an id_token from another issuer", { issuer: "https://evil.example" }, /iss/],
  ])("%s", async (_label, authorizeOptions, expectedError) => {
    const { session, errors, callback } = await signIn("oidc", { user: ada, ...authorizeOptions });
    expect(session).toBeNull();
    expect(errors.join(" ")).toMatch(expectedError);
    expect(callback.response?.headers.get("location")).toBe("/dashboard");
    expect(app.users.has("u-1")).toBe(false);
  });

  it("a response with another state", async () => {
    const { session, errors } = await signIn("oidc", { user: ada }, { tamperState: "forged-state" });
    expect(session).toBeNull();
    expect(errors.join(" ")).toMatch(/state/);
  });

  it("a code exchanged with another PKCE verifier", async () => {
    const { session } = await signIn("oidc", { user: ada }, { tamperCookies: (c) => c.replace(/oidc_light_auth_code_verifier=[^;]+/, `oidc_light_auth_code_verifier=${"x".repeat(43)}`) });
    expect(session).toBeNull();
  });

  it("a callback without the state cookie (sign in not started from this browser)", async () => {
    const { session, errors } = await signIn("oidc", { user: ada }, { tamperCookies: (c) => c.replace(/oidc_light_auth_state=[^;]+;?\s*/, "") });
    expect(session).toBeNull();
    expect(errors.join(" ")).toMatch(/state cookie is missing/);
  });

  it("a replayed authorization code", async () => {
    const first = await signIn("oidc", { user: ada });
    const replay = await app.call("GET", `/api/auth/callback/oidc?${new URLSearchParams({ code: first.code, state: first.authorizationUrl.searchParams.get("state")! })}`, {
      cookie: first.cookie,
    });
    expect(await readSessionCookie(replay.res)).toBeNull();
  });

  it("an error returned by the provider (the user denied the access)", async () => {
    const csrf = await csrfFixture();
    const login = await app.call("GET", `/api/auth/login/oidc?callbackUrl=/dashboard&${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
    const state = new URL(login.response!.headers.get("location")!).searchParams.get("state")!;
    const cookie = app.writtenCookies.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");

    const callback = await app.call("GET", `/api/auth/callback/oidc?error=access_denied&state=${state}`, { cookie });
    expect(await readSessionCookie(callback.res)).toBeNull();
    expect(callback.response?.headers.get("location")).toBe("/dashboard");
    expect(mock.tokenRequests).toHaveLength(0);
  });
});

describe("lifecycle hooks", () => {
  it("lets onUserSaving complete the user before it is stored, then raises onUserSaved and onLogin", async () => {
    const calls: string[] = [];
    app = createTestApp({
      providers: providers(),
      onSessionSaved: () => {
        calls.push("onSessionSaved");
      },
      onUserSaving: (user, tokens) => {
        calls.push("onUserSaving");
        return { ...user, role: "admin", hasRefreshToken: !!tokens?.refreshToken };
      },
      onUserSaved: (user) => {
        calls.push(`onUserSaved:${(user as { role?: string }).role}`);
      },
      onLogin: (session, providerName) => {
        calls.push(`onLogin:${session.providerUserId}:${providerName}`);
      },
    });

    await signIn("oidc", { user: ada });
    expect(calls).toEqual(["onSessionSaved", "onUserSaving", "onUserSaved:admin", "onLogin:u-1:oidc"]);
    expect(app.users.get("u-1")).toMatchObject({ role: "admin", hasRefreshToken: true });
  });
});

describe("userinfo endpoint", () => {
  beforeEach(() => {
    const userInfoProvider = createOidcProvider({
      providerName: "userinfo",
      issuer: ORIGIN,
      clientId: "oidc-client",
      clientSecret: "secret:oidc-client",
      getProfile: async ({ fetchUserInfo }) => {
        const claims = await fetchUserInfo();
        return { sub: String(claims.sub), email: String(claims.email), name: String(claims.name) };
      },
    });
    app = createTestApp({ providers: [userInfoProvider] });
  });

  it("gives the userinfo claims to getProfile", async () => {
    mock.options.userInfoOverrides = { name: "Ada (userinfo)" };
    const { session, errors } = await signIn("userinfo", { user: ada });
    expect(errors).toEqual([]);
    expect(session).toMatchObject({ providerUserId: "u-1", name: "Ada (userinfo)" });
  });

  it("rejects userinfo claims about another user than the id_token", async () => {
    mock.options.userInfoOverrides = { sub: "u-2" };
    const { session, errors } = await signIn("userinfo", { user: ada });
    expect(session).toBeNull();
    expect(errors.join(" ")).toMatch(/"sub"/);
  });
});

describe("token lifecycle", () => {
  const expireAccessToken = () => {
    const user = app.users.get("u-1")!;
    app.users.set("u-1", { ...user, accessTokenExpiresAt: new Date(Date.now() - 1000) });
    return user;
  };

  it("refreshes an expired access token and stores the rotated refresh token", async () => {
    await signIn("oidc", { user: ada });
    const before = expireAccessToken();

    const user = await getUserDirect({ config: app.config, providerUserId: "u-1" });
    expect(user?.accessToken).not.toBe(before.accessToken);
    expect(app.users.get("u-1")?.refreshToken).not.toBe(before.refreshToken);
    expect(app.config.onTokenRefresh).toHaveBeenCalledOnce();
  });

  it("forgets the tokens when the provider rejects the refresh token", async () => {
    await signIn("oidc", { user: ada });
    expireAccessToken();
    mock.options.refreshError = true;

    await getUserDirect({ config: app.config, providerUserId: "u-1" });
    expect(app.users.get("u-1")).toMatchObject({ accessToken: undefined, refreshToken: undefined });
  });

  it("runs the user hooks when saving the refreshed tokens, keeping the user when onUserSaving returns nothing", async () => {
    const onUserSaving = vi.fn();
    const onUserSaved = vi.fn();
    app = createTestApp({ providers: providers(), onUserSaving, onUserSaved });
    await signIn("oidc", { user: ada });
    expireAccessToken();
    onUserSaving.mockClear();
    onUserSaved.mockClear();

    const user = await getUserDirect({ config: app.config, providerUserId: "u-1" });
    expect(onUserSaving).toHaveBeenCalledWith(expect.objectContaining({ providerUserId: "u-1" }), expect.objectContaining({ accessToken: user?.accessToken }), expect.anything());
    expect(onUserSaved).toHaveBeenCalledWith(user, expect.anything());
    expect(app.users.get("u-1")?.accessToken).toBe(user?.accessToken);
  });

  it("revokes the refresh token, then the access token, on logout", async () => {
    const { sessionCookie } = await signIn("oidc", { user: ada });
    const { refreshToken, accessToken } = app.users.get("u-1")!;
    const csrf = await csrfFixture();

    const logout = await app.call("GET", `/api/auth/logout?revokeToken=true&${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: `${sessionCookie}; ${csrf.cookie}` });
    expect(logout.response?.status).toBe(302);
    expect(mock.revocations).toEqual([
      { token: refreshToken, hint: "refresh_token", clientId: "oidc-client" },
      { token: accessToken, hint: "access_token", clientId: "oidc-client" },
    ]);
    expect(app.users.has("u-1")).toBe(false);
  });
});

describe("OAuth 2.0 providers", () => {
  const octocat: MockUser = { sub: "1001", email: "octo@example.com", name: "Octo Cat" };

  it("signs in without nonce nor id_token, the identity coming from getProfile", async () => {
    const { authorizationUrl, session, errors } = await signIn("oauth2", { user: octocat, oidc: false });
    expect(errors).toEqual([]);
    expect(authorizationUrl.searchParams.get("nonce")).toBeNull();
    expect(authorizationUrl.searchParams.get("scope")).toBeNull();
    expect(session).toMatchObject({ providerUserId: "1001", email: "octo@example.com", name: "octocat" });
    expect(mock.tokenRequests.at(-1)?.method).toBe("client_secret_post");
  });

  it("signs in with the Discord preset", async () => {
    const { authorizationUrl, session } = await signIn("discord", { user: octocat, oidc: false });
    expect(authorizationUrl.searchParams.get("scope")).toBe("identify email");
    expect(session).toMatchObject({ providerUserId: "1001", name: "Octo Cat" });
    expect(app.users.get("1001")?.picture).toBe("https://cdn.discordapp.com/avatars/1001/a1b2.png");
  });
});

describe("Microsoft Entra ID multi-tenant", () => {
  const grace: MockUser = { sub: "e-1", email: "unused@example.com", name: "Grace Hopper", tid: "tenant-a" };

  it("accepts the issuer of the tenant of the signed-in user", async () => {
    const { session, errors } = await signIn("microsoft", {
      user: grace,
      issuer: "https://login.microsoftonline.com/tenant-a/v2.0",
      idTokenOverrides: { email: null, preferred_username: "grace@contoso.com" },
    });
    expect(errors).toEqual([]);
    expect(session).toMatchObject({ providerUserId: "e-1", email: "grace@contoso.com" });
  });

  it("rejects an id_token whose issuer is another tenant than its tid claim", async () => {
    const { session, errors } = await signIn("microsoft", { user: grace, issuer: "https://login.microsoftonline.com/tenant-b/v2.0" });
    expect(session).toBeNull();
    expect(errors.join(" ")).toMatch(/iss/);
  });
});

describe("form_post response mode (Sign in with Apple)", () => {
  it("asks for a posted response, without PKCE, with cookies sent on the cross-site POST", async () => {
    const { authorizationUrl, flowCookies } = await signIn("formpost", { user: ada }, { formPost: true });
    expect(authorizationUrl.searchParams.get("response_mode")).toBe("form_post");
    expect(authorizationUrl.searchParams.get("code_challenge")).toBeNull();
    expect(flowCookies.length).toBeGreaterThan(0);
    for (const cookie of flowCookies) expect(cookie).toMatchObject({ sameSite: "none", secure: true });
  });

  it("creates the session from the response posted by the provider domain", async () => {
    const { session, errors, callback } = await signIn("formpost", { user: ada }, { formPost: true });
    expect(callback.error).toBeUndefined();
    expect(errors).toEqual([]);
    expect(session?.providerUserId).toBe("u-1");
    expect(mock.tokenRequests.at(-1)?.method).toBe("client_secret_post");
  });
});

describe("configuration", () => {
  it("requires a redirectUri or LIGHT_AUTH_URL", async () => {
    app = createTestApp({ providers: providers(), env: { LIGHT_AUTH_SECRET_VALUE: app.config.env!.LIGHT_AUTH_SECRET_VALUE } });
    const csrf = await csrfFixture();
    const { error } = await app.call("GET", `/api/auth/login/oidc?${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });
    expect(error).toMatch(/LIGHT_AUTH_URL/);
  });
});
