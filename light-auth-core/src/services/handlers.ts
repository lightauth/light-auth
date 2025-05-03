import { generateState, generateCodeVerifier, OAuth2Tokens, decodeIdToken } from "arctic";

import { LightAuthProvider } from "../models/light-auth-provider";
import { LightAuthUser, LightAuthSession } from "../models/light-auth-session";
import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseRequest, BaseResponse } from "../models/light-auth-base";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";
import { decryptJwt, encryptJwt } from "./jwt";
/**
 * Checks the configuration and throws an error if any required fields are missing.
 * @param config The configuration object to check.
 * @returns The checked configuration object.
 * @throws Error if any required fields are missing.
 */
function checkConfig(config: LightAuthConfig, providerName?: string): Required<LightAuthConfig> & { provider: LightAuthProvider } {
  if (!Array.isArray(config.providers) || config.providers.length === 0) throw new Error("At least one provider is required");
  if (config.userStore == null) throw new Error("sessionStore is required");
  if (config.navigatoreStore == null) throw new Error("navigatoreStore is required");
  if (config.cookieStore == null) throw new Error("cookieStore is required");

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
  const { provider, navigatoreStore, cookieStore } = checkConfig(config, providerName);

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

  const stateCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_state`,
    path: "/",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  const codeVerifierCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_code_verifier`,
    path: "/",
    value: codeVerifier,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  await cookieStore.setCookies({ req, res, cookies: [stateCookie, codeVerifierCookie] });

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
  const { navigatoreStore, userStore: sessionStore, cookieStore, provider } = checkConfig(config, providerName);

  const url = await navigatoreStore.getUrl({ req });
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (code === null || state === null) throw new Error("state or code are missing from the request");

  const cookies = await cookieStore.getCookies({
    req,
    res,
    search: new RegExp(`^${provider.providerName}_light_auth_(state|code_verifier)$`),
  });

  if (cookies === null) throw new Error("Failed to get cookies");

  const storedStateCookie = cookies.find((cookie) => cookie.name === `${provider.providerName}_light_auth_state`);
  const codeVerifierCookie = cookies.find((cookie) => cookie.name === `${provider.providerName}_light_auth_code_verifier`);

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

  const id = sessionStore.generateStoreId();
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  const expiresAt = new Date(Date.now() + maxAge * 1000); // 30 days

  let session: LightAuthSession = {
    id: id,
    userId: claims.sub,
    email: claims.email,
    name: claims.name,
    expiresAt: expiresAt, // 30 days
    providerName: provider.providerName,
  };

  if (config.onSessionSaving) {
    const sessionSaving = await config.onSessionSaving(session, tokens);
    session = sessionSaving ?? session;
  }

  const encryptedSession = await encryptJwt(session);
  cookieStore.setCookies({
    req,
    res,
    cookies: [
      {
        name: DEFAULT_SESSION_COOKIE_NAME,
        value: encryptedSession,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days,
        path: "/",
      },
    ],
  });

  if (config.onSessionSaved) await config.onSessionSaved(session);

  let user: LightAuthUser = {
    ...session,
    picture: claims.picture,
    accessToken: access_token,
    refreshToken: refresh_token,
  };

  if (config.onUserSaving) {
    const userSaving = await config.onUserSaving(user, tokens);
    // if the user is not null, use it
    // if the user is null, use the original user
    user = userSaving ?? user;
  }

  await sessionStore.setUser({ req, res, user });

  if (config.onUserSaved) await config.onUserSaved(user);

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
  const { userStore, navigatoreStore, cookieStore } = checkConfig(config);

  const cookiesSession = await cookieStore.getCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME });
  if (cookiesSession == null) return res;
  // get the session from the cookie
  const cookieSession = cookiesSession.find((cookie) => cookie.name === DEFAULT_SESSION_COOKIE_NAME);
  if (cookieSession == null) return res;
  const session = JSON.parse(cookieSession.value) as LightAuthSession;

  // get the user from the session store
  const user = await userStore.getUser({ req, res, id: session.id });

  if (session) {
    // get the provider name from the session
    const providerName = session?.providerName;
    // get the provider from the config
    const provider = config.providers.find((p) => p.providerName === providerName);

    var token = user?.accessToken;
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
      await cookieStore.deleteCookies({
        req,
        res,
        search: new RegExp(`^${provider.providerName}_(state|code_verifier)$`),
      });
    }

    // delete the session
    if (user) await userStore.deleteUser({ req, res, user });

    // delete the session cookie
    await cookieStore.deleteCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME });
  }

  const redirectResponse = await navigatoreStore.redirectTo({ req, res, url: callbackUrl });
  return redirectResponse;
}

export async function sessionHandler({ config, req, res }: { config: LightAuthConfig; req?: BaseRequest; res?: BaseResponse }): Promise<Response> {
  try {
    const { cookieStore } = checkConfig(config);

    const cookiesSession = await cookieStore.getCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME });
    if (cookiesSession == null) return res;
    // get the session from the cookie
    const cookieSession = cookiesSession.find((cookie) => cookie.name === DEFAULT_SESSION_COOKIE_NAME);
    if (cookieSession == null) return res;
    const session = (await decryptJwt(cookieSession.value)) as LightAuthSession;

    if (session) {
      return new Response(JSON.stringify(session), { status: 200 });
    } else {
      throw new Error("Session not found");
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 200 });
  }
}
