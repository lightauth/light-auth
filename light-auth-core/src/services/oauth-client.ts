import * as oauth from "oauth4webapi";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";
import {
  type LightAuthOAuthProvider,
  type LightAuthProfileContext,
  type LightAuthServerEnv,
  type LightAuthTokens,
  type LightAuthUserClaims,
} from "../models";

const REQUEST_TIMEOUT_MS = 10_000;

// parameters handled by light auth, they cannot be overridden through the provider searchParams
const RESERVED_AUTHORIZATION_PARAMETERS = new Set(["response_type", "client_id", "redirect_uri", "state", "nonce", "code_challenge", "code_challenge_method"]);

const discoveryCache = new Map<string, Promise<oauth.AuthorizationServer>>();
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export type LightAuthAuthorizationRequest = {
  url: URL;
  state: string;
  codeVerifier?: string;
  nonce?: string;
};

/** OpenID Connect providers have an issuer: they return an id_token, validated with a nonce */
export function isOidcProvider(provider: LightAuthOAuthProvider): boolean {
  return !!provider.issuer;
}

function discover(issuer: string): Promise<oauth.AuthorizationServer> {
  let authorizationServer = discoveryCache.get(issuer);
  if (!authorizationServer) {
    const issuerUrl = new URL(issuer);
    authorizationServer = oauth
      .discoveryRequest(issuerUrl, { signal: () => AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
      .then((response) => oauth.processDiscoveryResponse(issuerUrl, response));
    // a failed discovery is retried on the next request
    authorizationServer.catch(() => discoveryCache.delete(issuer));
    discoveryCache.set(issuer, authorizationServer);
  }
  return authorizationServer;
}

/**
 * Authorization server metadata, discovered from the issuer when the endpoints are not all explicit.
 * Explicit endpoints always take precedence over the discovered ones.
 */
export async function getAuthorizationServer(provider: LightAuthOAuthProvider): Promise<oauth.AuthorizationServer> {
  const needsDiscovery = !!provider.issuer && !(provider.authorizationEndpoint && provider.tokenEndpoint);
  const discovered = needsDiscovery && provider.issuer ? await discover(provider.issuer) : undefined;

  const authorizationEndpoint = provider.authorizationEndpoint ?? discovered?.authorization_endpoint;
  const tokenEndpoint = provider.tokenEndpoint ?? discovered?.token_endpoint;
  if (!authorizationEndpoint || !tokenEndpoint)
    throw new Error(`light-auth: provider ${provider.providerName} needs an issuer, or explicit authorizationEndpoint and tokenEndpoint`);

  return {
    ...discovered,
    issuer: provider.issuer ?? discovered?.issuer ?? new URL(authorizationEndpoint).origin,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    userinfo_endpoint: provider.userInfoEndpoint ?? discovered?.userinfo_endpoint,
    revocation_endpoint: provider.revocationEndpoint ?? discovered?.revocation_endpoint,
    jwks_uri: provider.jwksUri ?? discovered?.jwks_uri,
  };
}

/**
 * Callback URL of the provider: the configured redirectUri, or `${LIGHT_AUTH_URL}${basePath}/callback/${providerName}`.
 * Never derived from the request Host header, which can be spoofed.
 */
export function resolveRedirectUri(provider: LightAuthOAuthProvider, env: LightAuthServerEnv, basePath: string): string {
  if (provider.redirectUri) return provider.redirectUri;

  const appUrl = env["LIGHT_AUTH_URL"];
  if (!appUrl) throw new Error(`light-auth: provider ${provider.providerName} has no redirectUri, set it or define the LIGHT_AUTH_URL environment variable`);

  return new URL(`${basePath}/callback/${provider.providerName}`, appUrl).toString();
}

function getClient(provider: LightAuthOAuthProvider): oauth.Client {
  return { client_id: provider.clientId };
}

async function getClientAuthentication(provider: LightAuthOAuthProvider): Promise<oauth.ClientAuth> {
  const clientSecret = typeof provider.clientSecret === "function" ? await provider.clientSecret() : provider.clientSecret;
  const method = provider.clientAuthentication ?? (clientSecret ? "client_secret_basic" : "none");

  if (method === "none") return oauth.None();
  if (!clientSecret) throw new Error(`light-auth: provider ${provider.providerName} needs a clientSecret for ${method}`);
  return method === "client_secret_post" ? oauth.ClientSecretPost(clientSecret) : oauth.ClientSecretBasic(clientSecret);
}

function getHttpOptions(provider: LightAuthOAuthProvider) {
  return {
    headers: provider.headers ? Object.fromEntries(provider.headers) : undefined,
    signal: () => AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
}

function getJwks(jwksUri: string) {
  let jwks = jwksCache.get(jwksUri);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(jwksUri), { timeoutDuration: REQUEST_TIMEOUT_MS });
    jwksCache.set(jwksUri, jwks);
  }
  return jwks;
}

/**
 * Builds the authorization URL, with a state, a PKCE code challenge and, for OpenID Connect, a nonce.
 */
export async function createAuthorizationRequest(
  provider: LightAuthOAuthProvider,
  args: { env: LightAuthServerEnv; basePath: string }
): Promise<LightAuthAuthorizationRequest> {
  const as = await getAuthorizationServer(provider);
  const url = new URL(as.authorization_endpoint!);
  const state = oauth.generateRandomState();

  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", provider.clientId);
  url.searchParams.set("redirect_uri", resolveRedirectUri(provider, args.env, args.basePath));
  url.searchParams.set("state", state);

  const scopes = provider.scopes ?? [];
  if (scopes.length > 0) url.searchParams.set("scope", scopes.join(" "));

  let codeVerifier: string | undefined;
  if (provider.pkce !== false) {
    codeVerifier = oauth.generateRandomCodeVerifier();
    url.searchParams.set("code_challenge", await oauth.calculatePKCECodeChallenge(codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }

  let nonce: string | undefined;
  if (isOidcProvider(provider)) {
    nonce = oauth.generateRandomNonce();
    url.searchParams.set("nonce", nonce);
  }

  if (provider.responseMode === "form_post") url.searchParams.set("response_mode", "form_post");

  if (provider.searchParams)
    for (const [key, value] of provider.searchParams) if (!RESERVED_AUTHORIZATION_PARAMETERS.has(key)) url.searchParams.set(key, value);

  return { url, state, codeVerifier, nonce };
}

/**
 * Microsoft Entra ID multi-tenant: the expected issuer depends on the tenant of the signed-in user.
 * The claims are only decoded here to compute that issuer, the id_token is then fully validated against it.
 */
async function withIdTokenIssuer(provider: LightAuthOAuthProvider, as: oauth.AuthorizationServer, response: Response): Promise<oauth.AuthorizationServer> {
  if (!provider.getIdTokenIssuer) return as;
  try {
    const body = await response.clone().json();
    if (typeof body?.id_token !== "string") return as;
    return { ...as, issuer: provider.getIdTokenIssuer(decodeJwt(body.id_token)) };
  } catch {
    return as;
  }
}

async function toLightAuthTokens(provider: LightAuthOAuthProvider, as: oauth.AuthorizationServer, response: oauth.TokenEndpointResponse): Promise<LightAuthTokens> {
  let idTokenClaims: Record<string, unknown> | undefined;

  if (response.id_token) {
    // oauth4webapi has validated the id_token claims (issuer, audience, expiration, nonce): verify its signature as well
    if (!as.jwks_uri) throw new Error(`light-auth: provider ${provider.providerName} returned an id_token but has no jwksUri to verify it`);
    const { payload } = await jwtVerify(response.id_token, getJwks(as.jwks_uri), {
      issuer: as.issuer,
      audience: provider.clientId,
      algorithms: as.id_token_signing_alg_values_supported ?? ["RS256"],
      clockTolerance: 30,
    });
    idTokenClaims = { ...payload };
  }

  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    accessTokenExpiresAt: typeof response.expires_in === "number" ? new Date(Date.now() + response.expires_in * 1000) : undefined,
    refreshToken: response.refresh_token,
    idToken: response.id_token,
    idTokenClaims,
    scopes: typeof response.scope === "string" ? response.scope.split(/[\s,]+/).filter(Boolean) : undefined,
    raw: { ...response },
  };
}

/**
 * Validates the authorization response (state, error) and exchanges the authorization code for tokens.
 */
export async function exchangeAuthorizationCode(
  provider: LightAuthOAuthProvider,
  args: {
    env: LightAuthServerEnv;
    basePath: string;
    callbackParameters: URLSearchParams;
    expectedState: string;
    codeVerifier?: string;
    nonce?: string;
  }
): Promise<LightAuthTokens> {
  const as = await getAuthorizationServer(provider);
  const client = getClient(provider);

  const parameters = oauth.validateAuthResponse(as, client, args.callbackParameters, args.expectedState);
  const response = await oauth.authorizationCodeGrantRequest(
    as,
    client,
    await getClientAuthentication(provider),
    parameters,
    resolveRedirectUri(provider, args.env, args.basePath),
    args.codeVerifier ?? oauth.nopkce,
    getHttpOptions(provider)
  );

  const validationAs = await withIdTokenIssuer(provider, as, response);
  const result = await oauth.processAuthorizationCodeResponse(validationAs, client, response, {
    expectedNonce: args.nonce ?? oauth.expectNoNonce,
    requireIdToken: isOidcProvider(provider),
  });

  return await toLightAuthTokens(provider, validationAs, result);
}

/**
 * Gets new tokens with a refresh token.
 */
export async function refreshTokens(provider: LightAuthOAuthProvider, refreshToken: string): Promise<LightAuthTokens> {
  const as = await getAuthorizationServer(provider);
  const client = getClient(provider);

  const response = await oauth.refreshTokenGrantRequest(as, client, await getClientAuthentication(provider), refreshToken, getHttpOptions(provider));
  const validationAs = await withIdTokenIssuer(provider, as, response);
  const result = await oauth.processRefreshTokenResponse(validationAs, client, response);

  return await toLightAuthTokens(provider, validationAs, result);
}

/** The refresh token was revoked or has expired: the user has to sign in again */
export function isInvalidGrantError(error: unknown): boolean {
  return error instanceof oauth.ResponseBodyError && error.error === "invalid_grant";
}

/**
 * Revokes a token with the provider revokeToken function or its RFC 7009 revocation endpoint.
 * @returns false when the provider does not support token revocation
 */
export async function revokeProviderToken(provider: LightAuthOAuthProvider, token: string, tokenTypeHint: "access_token" | "refresh_token"): Promise<boolean> {
  if (provider.revokeToken) {
    await provider.revokeToken({ token, tokenTypeHint });
    return true;
  }

  const as = await getAuthorizationServer(provider);
  if (!as.revocation_endpoint) return false;

  const response = await oauth.revocationRequest(as, getClient(provider), await getClientAuthentication(provider), token, {
    ...getHttpOptions(provider),
    additionalParameters: { token_type_hint: tokenTypeHint },
  });
  await oauth.processRevocationResponse(response);
  return true;
}

async function fetchResource(provider: LightAuthOAuthProvider, accessToken: string, url: string): Promise<unknown> {
  const headers = new Headers(provider.headers ? Object.fromEntries(provider.headers) : undefined);
  headers.set("accept", "application/json");

  const response = await oauth.protectedResourceRequest(accessToken, "GET", new URL(url), headers, undefined, {
    signal: () => AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`light-auth: request to ${url} failed with status ${response.status}`);
  return await response.json();
}

async function fetchUserInfo(provider: LightAuthOAuthProvider, as: oauth.AuthorizationServer, tokens: LightAuthTokens): Promise<Record<string, unknown>> {
  if (!as.userinfo_endpoint) throw new Error(`light-auth: provider ${provider.providerName} has no userinfo endpoint`);

  // OAuth 2.0 providers (GitHub, Discord...) expose plain JSON APIs without the OpenID Connect sub claim
  if (!isOidcProvider(provider)) return (await fetchResource(provider, tokens.accessToken, as.userinfo_endpoint)) as Record<string, unknown>;

  const client = getClient(provider);
  const response = await oauth.userInfoRequest(as, client, tokens.accessToken, getHttpOptions(provider));
  const expectedSubject = typeof tokens.idTokenClaims?.sub === "string" ? tokens.idTokenClaims.sub : oauth.skipSubjectCheck;
  return { ...(await oauth.processUserInfoResponse(as, client, expectedSubject, response)) };
}

/**
 * Maps OpenID Connect standard claims to the light auth claims.
 */
export function toStandardProfile(claims: Record<string, unknown>): LightAuthUserClaims {
  const fullName = [claims.given_name, claims.family_name].filter((part) => typeof part === "string" && part).join(" ");
  const name = claims.name ?? (fullName || claims.preferred_username || claims.email);

  return {
    sub: String(claims.sub),
    email: (claims.email ?? "") as string,
    name: (name ?? "") as string,
    picture: typeof claims.picture === "string" ? claims.picture : undefined,
  };
}

/**
 * Identity of the signed-in user: provider getProfile function, or the validated id_token claims, or the userinfo endpoint.
 */
export async function getProviderProfile(
  provider: LightAuthOAuthProvider,
  tokens: LightAuthTokens,
  callbackParameters: URLSearchParams
): Promise<LightAuthUserClaims> {
  const as = await getAuthorizationServer(provider);
  const context: LightAuthProfileContext = {
    tokens,
    callbackParameters,
    fetchUserInfo: () => fetchUserInfo(provider, as, tokens),
    fetchResource: (url: string) => fetchResource(provider, tokens.accessToken, url),
  };

  let profile: LightAuthUserClaims;
  if (provider.getProfile) {
    profile = await provider.getProfile(context);
  } else {
    const claims = tokens.idTokenClaims ?? (as.userinfo_endpoint ? await context.fetchUserInfo() : undefined);
    if (!claims) throw new Error(`light-auth: provider ${provider.providerName} returned no id_token and has no userinfo endpoint, add a getProfile function`);
    profile = toStandardProfile(claims);
  }

  if (!profile?.sub || profile.sub === "undefined") throw new Error(`light-auth: provider ${provider.providerName} did not return a user identifier (sub)`);
  return { ...profile, sub: String(profile.sub) };
}
