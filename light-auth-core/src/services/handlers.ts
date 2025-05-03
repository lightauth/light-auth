import { generateState, generateCodeVerifier, OAuth2Tokens, decodeIdToken } from "arctic";

import { LightAuthProvider } from "../models/light-auth-provider";
import { LightAuthSession } from "../models/light-auth-session";
import { Cookie } from "../models/cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseRequest, BaseResponse } from "../models/base";
import * as encoding from "@oslojs/encoding";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";
/**
 * Checks the configuration and throws an error if any required fields are missing.
 * @param config The configuration object to check.
 * @returns The checked configuration object.
 * @throws Error if any required fields are missing.
 */
function checkConfig(config: LightAuthConfig, providerName?: string): Required<LightAuthConfig> & { provider: LightAuthProvider } {
  if (!Array.isArray(config.providers) || config.providers.length === 0) throw new Error("At least one provider is required");
  if (config.sessionStore == null) throw new Error("sessionStore is required");
  if (config.navigatoreStore == null) throw new Error("navigatoreStore is required");

  // if providerName is provider, check if the provider is in the config
  if (providerName && !config.providers.some((p) => p.providerName.toLocaleLowerCase() == providerName.toLocaleLowerCase()))
    throw new Error(`Provider ${providerName} not found`);

  const provider = !providerName ? config.providers[0] : config.providers.find((p) => p.providerName.toLocaleLowerCase() == providerName.toLocaleLowerCase());
  if (!provider) throw new Error(`Provider ${providerName} not found`);

  return {
    ...(config as Required<LightAuthConfig>),
    provider,
  };
}

/**
 * Redirects the user to the provider login page.
 */
export async function redirectToProviderLogin({
  config,
  req,
  res,
  providerName,
}: {
  config: LightAuthConfig;
  req?: BaseRequest;
  res?: BaseResponse;
  providerName?: string;
}): Promise<BaseResponse> {
  const { provider, navigatoreStore } = checkConfig(config, providerName);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Using Set to ensure unique scopes
  // and adding default scopes
  const scopeSet = new Set(provider.scopes ?? []);
  scopeSet.add("openid");
  scopeSet.add("profile");
  scopeSet.add("email");
  const scopes = Array.from(scopeSet);

  const url = provider.artic.createAuthorizationURL(state, codeVerifier, scopes);

  // add additional params to the url
  if (provider.searchParams) {
    for (const [key, value] of provider.searchParams) {
      url.searchParams.append(key, value);
    }
  }

  // add additional headers
  if (provider.headers) {
    await navigatoreStore.setHeaders({ req, res, headers: provider.headers });
  }

  const stateCookie: Cookie = {
    name: `${DEFAULT_SESSION_COOKIE_NAME}.${provider.providerName}_oauth_state`,
    path: "/",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  const codeVerifierCookie: Cookie = {
    name: `${DEFAULT_SESSION_COOKIE_NAME}.${provider.providerName}_code_verifier`,
    path: "/",
    value: codeVerifier,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  await navigatoreStore.setCookies({ req, res, cookies: [stateCookie, codeVerifierCookie] });

  const redirect = await navigatoreStore.redirectTo({ req, res, url: url.toString() });

  return redirect;
}

export async function providerCallback({
  config,
  req,
  res,
  providerName,
  callbackUrl = "/",
}: {
  config: LightAuthConfig;
  req?: BaseRequest;
  res?: BaseResponse;
  providerName?: string;
  callbackUrl: string;
}): Promise<Response> {
  const { navigatoreStore, sessionStore, provider } = checkConfig(config, providerName);

  const url = await navigatoreStore.getUrl({ req });
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code === null || state === null) throw new Error("state or code are missing from the request");

  const cookies = await navigatoreStore.getCookies({
    req,
    res,
    search: new RegExp(`^${provider.providerName}_(oauth_state|code_verifier)$`),
  });

  if (cookies === null) throw new Error("Failed to get cookies");

  const storedStateCookie = cookies.find((cookie) => cookie.name === `${DEFAULT_SESSION_COOKIE_NAME}.${provider.providerName}_oauth_state`);
  const codeVerifierCookie = cookies.find((cookie) => cookie.name === `${DEFAULT_SESSION_COOKIE_NAME}.${provider.providerName}_code_verifier`);

  if (storedStateCookie == null || codeVerifierCookie == null) throw new Error("Invalid state or code verifier");

  // validate the state
  if (storedStateCookie.value !== state) throw new Error("Invalid state");

  // validate the authorization code
  let tokens = await provider.artic.validateAuthorizationCode(code, codeVerifierCookie.value);

  if (tokens === null) throw new Error("Failed to fetch tokens");

  // get the access token
  const access_token = tokens.accessToken();

  // get the claims from the id token
  const claims = decodeIdToken(tokens.idToken()) as {
    sub: string;
    name: string;
    email: string;
    picture?: string;
  };

  let refresh_token: string | undefined;
  if (tokens.hasRefreshToken()) refresh_token = tokens.refreshToken();

  // create a new session
  let session: LightAuthSession = {
    id: sessionStore.generateSessionId(),
    user_id: claims.sub,
    email: claims.email,
    name: claims.name,
    picture: claims.picture,
    expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
    access_token: access_token,
    refresh_token: refresh_token,
    providerName: provider.providerName,
  };

  if (config.onSessionSaving) {
    const sessionSaving = await config.onSessionSaving(session);

    // if the session is not null, use it
    // if the session is null, use the original session
    session = sessionSaving ?? session;
  }

  await sessionStore.setSession({ req, res, session });

  if (config.onSessionSaved) await config.onSessionSaved(session);

  const redirectResponse = await navigatoreStore.redirectTo({ req, res, url: callbackUrl });
  return redirectResponse;
}

export async function logoutAndRevokeToken({
  config,
  req,
  res,
  revokeToken = true,
  callbackUrl = "/",
}: {
  config: LightAuthConfig;
  req?: BaseRequest;
  res?: BaseResponse;
  revokeToken?: boolean;
  callbackUrl?: string;
}): Promise<Response> {
  const { sessionStore, navigatoreStore } = checkConfig(config);

  const session = await sessionStore.getSession({ req, res });

  if (session) {
    // get the provider name from the session
    const providerName = session?.providerName;
    // get the provider from the config
    const provider = config.providers.find((p) => p.providerName === providerName);

    var token = session?.access_token;
    if (token && provider && revokeToken) {
      // Revoke the token if the provider supports it
      if (typeof provider.artic.revokeToken === "function") {
        try {
          await provider.artic.revokeToken(token);
        } catch (e) {
          console.warn("Failed to revoke token:", e);
        }
      }
    }

    if (provider) {
      // delete the state cookie
      await navigatoreStore.deleteCookies({
        req,
        res,
        cookiesNames: [
          `${DEFAULT_SESSION_COOKIE_NAME}.${provider.providerName}_oauth_state`,
          `${DEFAULT_SESSION_COOKIE_NAME}.${provider.providerName}_code_verifier`,
        ],
      });
    }

    // delete the session
    await sessionStore.deleteSession({ req, res });
  }

  const redirectResponse = await navigatoreStore.redirectTo({ req, res, url: callbackUrl });
  return redirectResponse;
}

export async function sessionHandler({ config, req, res }: { config: LightAuthConfig; req?: BaseRequest; res?: BaseResponse }): Promise<Response> {
  try {
    if (config.sessionStore == null) throw new Error("sessionStore is required");

    const session = await config.sessionStore.getSession({ req, res });

    if (session) {
      return new Response(JSON.stringify(session), { status: 200 });
    } else {
      throw new Error("Session not found");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 200 });
  }
}
