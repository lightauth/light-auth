import { decodeProtectedHeader, exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { describe, expect, it, vi } from "vitest";
import {
  createAppleProvider,
  createDiscordProvider,
  createGitHubProvider,
  createGoogleProvider,
  createMicrosoftEntraIdProvider,
  createOAuth2Provider,
  createOidcProvider,
  ensureProviderType,
  type LightAuthProfileContext,
  type LightAuthTokens,
} from "../src";

const tokens: LightAuthTokens = { accessToken: "access", tokenType: "bearer", raw: {} };

function profileContext(overrides: Partial<LightAuthProfileContext>): LightAuthProfileContext {
  return {
    tokens,
    callbackParameters: new URLSearchParams(),
    fetchUserInfo: async () => ({}),
    fetchResource: async () => ({}),
    ...overrides,
  };
}

describe("generic providers", () => {
  it("OpenID Connect providers request the openid, profile and email scopes, extended with the configured ones", () => {
    const provider = createOidcProvider({ providerName: "keycloak", issuer: "https://sso.example/realms/main", clientId: "id", scopes: ["offline_access", "email"] });
    expect(provider.type).toBe("oauth");
    expect(provider.scopes).toEqual(["openid", "profile", "email", "offline_access"]);
  });

  it("OAuth 2.0 providers have no default scope and no issuer", () => {
    const provider = createOAuth2Provider({ providerName: "custom", clientId: "id", authorizationEndpoint: "https://a.example/authorize", tokenEndpoint: "https://a.example/token" });
    expect(provider.scopes).toEqual([]);
    expect(provider.issuer).toBeUndefined();
  });
});

describe("Google", () => {
  it("is an OpenID Connect provider with an optional offline access", () => {
    const provider = createGoogleProvider({ clientId: "id", clientSecret: "secret", accessType: "offline", scopes: ["https://www.googleapis.com/auth/calendar.readonly"] });
    expect(provider.providerName).toBe("google");
    expect(provider.issuer).toBe("https://accounts.google.com");
    expect(provider.scopes).toEqual(["openid", "profile", "email", "https://www.googleapis.com/auth/calendar.readonly"]);
    expect(provider.searchParams?.get("access_type")).toBe("offline");
  });
});

describe("Microsoft Entra ID", () => {
  it("validates the issuer of the signed-in tenant for multi-tenant authorities", () => {
    const provider = createMicrosoftEntraIdProvider({ clientId: "id" });
    expect(provider.authorizationEndpoint).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
    expect(provider.issuer).toBe("https://login.microsoftonline.com/{tenantid}/v2.0");
    expect(provider.getIdTokenIssuer?.({ tid: "tenant-a" })).toBe("https://login.microsoftonline.com/tenant-a/v2.0");
  });

  it("expects the exact issuer of a tenant id", () => {
    const tenant = "8eaef023-2b34-4da1-9baa-8bc8c9d6a490";
    const provider = createMicrosoftEntraIdProvider({ clientId: "id", tenant });
    expect(provider.issuer).toBe(`https://login.microsoftonline.com/${tenant}/v2.0`);
    expect(provider.getIdTokenIssuer).toBeUndefined();
  });

  it("reads the email from preferred_username when the optional email claim is missing", async () => {
    const provider = createMicrosoftEntraIdProvider({ clientId: "id" });
    const profile = await provider.getProfile!(
      profileContext({ tokens: { ...tokens, idTokenClaims: { sub: "s1", name: "Grace Hopper", preferred_username: "grace@contoso.com" } } })
    );
    expect(profile).toMatchObject({ sub: "s1", email: "grace@contoso.com", name: "Grace Hopper" });
  });
});

describe("GitHub", () => {
  const github = () => createGitHubProvider({ clientId: "client-id", clientSecret: "client-secret", headers: new Map([["x-extra", "1"]]) });

  it("is an OAuth 2.0 provider authenticating with client_secret_post", () => {
    const provider = github();
    expect(provider.issuer).toBeUndefined();
    expect(provider.scopes).toEqual(["read:user", "user:email"]);
    expect(provider.clientAuthentication).toBe("client_secret_post");
    expect([...(provider.headers ?? [])]).toEqual([
      ["user-agent", "light-auth"],
      ["x-extra", "1"],
    ]);
  });

  it("uses the primary verified email when the public one is hidden", async () => {
    const profile = await github().getProfile!(
      profileContext({
        fetchUserInfo: async () => ({ id: 42, login: "octocat", name: null, email: null, avatar_url: "https://avatars.example/42" }),
        fetchResource: async () => [
          { email: "secondary@example.com", primary: false, verified: true },
          { email: "primary@example.com", primary: true, verified: true },
        ],
      })
    );
    expect(profile).toEqual({ sub: "42", email: "primary@example.com", name: "octocat", picture: "https://avatars.example/42" });
  });

  it("never uses an unverified email", async () => {
    const profileWithEmails = (emails: { email: string; primary: boolean; verified: boolean }[]) =>
      github().getProfile!(profileContext({ fetchUserInfo: async () => ({ id: 42, login: "octocat", email: null }), fetchResource: async () => emails }));

    const unverifiedPrimary = { email: "unverified@example.com", primary: true, verified: false };
    expect((await profileWithEmails([unverifiedPrimary, { email: "verified@example.com", primary: false, verified: true }])).email).toBe("verified@example.com");
    expect((await profileWithEmails([unverifiedPrimary])).email).toBe("");
  });

  it("revokes access tokens through its REST API", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await github().revokeToken!({ token: "gho_token", tokenTypeHint: "access_token" });
    await github().revokeToken!({ token: "refresh", tokenTypeHint: "refresh_token" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/applications/client-id/token");
    expect(init?.method).toBe("DELETE");
    expect((init?.headers as Record<string, string>).authorization).toBe(`Basic ${btoa("client-id:client-secret")}`);
    expect(JSON.parse(String(init?.body))).toEqual({ access_token: "gho_token" });
  });
});

describe("Discord", () => {
  it("maps the Discord user", async () => {
    const provider = createDiscordProvider({ clientId: "id", clientSecret: "secret" });
    expect(provider.scopes).toEqual(["identify", "email"]);
    const profile = await provider.getProfile!(
      profileContext({ fetchUserInfo: async () => ({ id: "80351110224678912", username: "nelly", global_name: "Nelly", email: "nelly@example.com", avatar: "8342729096ea3675442027381ff50dfe" }) })
    );
    expect(profile).toEqual({
      sub: "80351110224678912",
      email: "nelly@example.com",
      name: "Nelly",
      picture: "https://cdn.discordapp.com/avatars/80351110224678912/8342729096ea3675442027381ff50dfe.png",
    });
  });
});

describe("Apple", () => {
  it("signs a short-lived ES256 client secret with the developer key", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
    // keys stored in environment variables usually have escaped new lines
    const pem = (await exportPKCS8(privateKey)).replace(/\n/g, "\\n");
    const provider = createAppleProvider({ clientId: "com.example.web", teamId: "TEAM123", keyId: "KEY123", privateKey: pem });

    const clientSecret = await (provider.clientSecret as () => Promise<string>)();
    const { payload } = await jwtVerify(clientSecret, publicKey, { issuer: "TEAM123", subject: "com.example.web", audience: "https://appleid.apple.com" });
    expect(decodeProtectedHeader(clientSecret).kid).toBe("KEY123");
    expect(payload.exp! - payload.iat!).toBe(300);
  });

  it("posts the authorization response and requests the name and the email", () => {
    const provider = createAppleProvider({ clientId: "id", teamId: "t", keyId: "k", privateKey: "unused" });
    expect(provider.responseMode).toBe("form_post");
    expect(provider.clientAuthentication).toBe("client_secret_post");
    expect(provider.scopes).toEqual(["name", "email"]);
  });

  it("reads the user name sent on the first sign in", async () => {
    const provider = createAppleProvider({ clientId: "id", teamId: "t", keyId: "k", privateKey: "unused" });
    const profile = await provider.getProfile!(
      profileContext({
        tokens: { ...tokens, idTokenClaims: { sub: "001234.abcd", email: "ada@privaterelay.appleid.com" } },
        callbackParameters: new URLSearchParams({ user: JSON.stringify({ name: { firstName: "Ada", lastName: "Lovelace" } }) }),
      })
    );
    expect(profile).toEqual({ sub: "001234.abcd", email: "ada@privaterelay.appleid.com", name: "Ada Lovelace" });
  });
});

describe("provider configuration", () => {
  it("rejects the former arctic configuration with a migration hint", () => {
    expect(() => ensureProviderType({ providerName: "google", arctic: {} })).toThrow(/arctic.*createGoogleProvider/s);
  });

  it("adds the type of providers declared without it", () => {
    expect(ensureProviderType({ providerName: "x", clientId: "id" }).type).toBe("oauth");
    expect(ensureProviderType({ providerName: "c", verifyCredentials: () => null }).type).toBe("credentials");
  });
});
