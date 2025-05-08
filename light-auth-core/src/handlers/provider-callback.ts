import { generateState, generateCodeVerifier, decodeIdToken } from "arctic";

import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseResponse } from "../models/light-auth-base";
import { buildSecret, checkConfig, getSessionExpirationMaxAge } from "../services/utils";
import { LightAuthSession, LightAuthUser } from "../models/light-auth-session";
import { encryptJwt } from "../services/jwt";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";

export async function providerCallbackHandler(args: {
  config: LightAuthConfig;
  providerName?: string;
  callbackUrl: string;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, providerName, callbackUrl } = args;
  const { router, userAdapter, cookieStore, provider } = checkConfig(config, providerName);

  const url = await router.getUrl({ ...args });
  const reqUrl = new URL(url);
  const code = reqUrl.searchParams.get("code");
  const state = reqUrl.searchParams.get("state");

  if (code === null || state === null) throw new Error("light-auth: state or code are missing from the request");

  const cookies = await cookieStore.getCookies({
    search: new RegExp(`^${provider.providerName}_light_auth_(state|code_verifier)$`),
    ...args,
  });

  if (cookies === null) throw new Error("light-auth: Failed to get cookies");

  const storedStateCookie = cookies.find((cookie) => cookie.name === `${provider.providerName}_light_auth_state`);
  const codeVerifierCookie = cookies.find((cookie) => cookie.name === `${provider.providerName}_light_auth_code_verifier`);

  if (storedStateCookie == null || codeVerifierCookie == null) throw new Error("light-auth: Invalid state or code verifier");

  // validate the state
  if (storedStateCookie.value !== state) throw new Error("light-auth: Invalid state");

  // validate the authorization code
  let tokens = await provider.artic.validateAuthorizationCode(code, codeVerifierCookie.value);

  if (tokens === null) throw new Error("light-auth: Failed to fetch tokens");

  // Calculate the access token expiration time
  // The access token expiration time is the number of seconds until the token expires
  // The default expiration time is 3600 seconds (1 hour)
  // https://www.ietf.org/rfc/rfc6749.html#section-4.2.2
  let accessTokenExpiresIn: number = 3600; // default to 1 hour
  if ("expires_in" in tokens.data && typeof tokens.data.expires_in === "number") {
    accessTokenExpiresIn = Number(tokens.data.expires_in);
  }
  const accessTokenExpiresAt = new Date(Date.now() + accessTokenExpiresIn * 1000); // 1 hour

  // get the access token
  const accessToken = tokens.accessToken();

  // get the claims from the id token
  const claims = decodeIdToken(tokens.idToken()) as {
    sub: string;
    name: string;
    email: string;
    picture?: string;
  };

  let refresh_token: string | undefined;
  if (tokens.hasRefreshToken()) refresh_token = tokens.refreshToken();

  const id = cookieStore.generateStoreId();
  const maxAge = getSessionExpirationMaxAge();

  const expiresAt = new Date(Date.now() + maxAge * 1000);

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

  const encryptedSession = await encryptJwt(session, buildSecret(config.env));
  cookieStore.setCookies({
    cookies: [
      {
        name: DEFAULT_SESSION_COOKIE_NAME,
        value: encryptedSession,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: maxAge, // 30 days,
        path: "/",
      },
    ],
    ...args,
  });

  if (config.onSessionSaved) await config.onSessionSaved(session);

  // Omit expiresAt from session when creating user
  const { expiresAt: sessionExpiresAt, ...sessionWithoutExpiresAt } = session;
  let user: LightAuthUser = {
    ...sessionWithoutExpiresAt,
    picture: claims.picture,
    accessToken: accessToken,
    accessTokenExpiresAt: accessTokenExpiresAt,
    refreshToken: refresh_token,
  };

  if (config.onUserSaving) {
    const userSaving = await config.onUserSaving(user, tokens);
    // if the user is not null, use it
    // if the user is null, use the original user
    user = userSaving ?? user;
  }

  if (userAdapter) await userAdapter.setUser({ user, ...args });

  if (config.onUserSaved) await config.onUserSaved(user);

  const redirectResponse = await router.redirectTo({ url: callbackUrl, ...args });
  return redirectResponse;
}
