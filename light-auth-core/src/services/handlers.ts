import { generateState, generateCodeVerifier, OAuth2Tokens, decodeIdToken } from "arctic";

import { LightAuthProvider } from "../models/light-auth-provider";
import { LightAuthUser, LightAuthSession } from "../models/light-auth-session";
import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseRequest, BaseResponse } from "../models/light-auth-base";
import { DEFAULT_SESSION_COOKIE_NAME, DEFAULT_SESSION_EXPIRATION } from "../constants";
import { decryptJwt, encryptJwt } from "./jwt";
import { getSessionExpirationMaxAge } from "./utils";
/**
 * Checks the configuration and throws an error if any required fields are missing.
 * @param config The configuration object to check.
 * @returns The checked configuration object.
 * @throws Error if any required fields are missing.
 */
function checkConfig(config: LightAuthConfig, providerName?: string): Required<LightAuthConfig> & { provider: LightAuthProvider } {
  if (!process.env.LIGHT_AUTH_SECRET_VALUE) {
    throw new Error("LIGHT_AUTH_SECRET_VALUE is required in environment variables");
  }
  if (!Array.isArray(config.providers) || config.providers.length === 0) throw new Error("At least one provider is required");
  if (config.userAdapter == null) throw new Error("userAdapter is required");
  if (config.router == null) throw new Error("router is required");
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
export async function redirectToProviderLoginHandler({
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
  const { provider, router, cookieStore } = checkConfig(config, providerName);

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
    await router.setHeaders({ req, res, headers: provider.headers });
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

  const redirect = await router.redirectTo({ req, res, url: url.toString() });

  return redirect;
}

export async function providerCallbackHandler({
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
  const { router, userAdapter, cookieStore, provider } = checkConfig(config, providerName);

  const url = await router.getUrl({ req });
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

  const id = userAdapter.generateStoreId();
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
        maxAge: maxAge, // 30 days,
        path: "/",
      },
    ],
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

  await userAdapter.setUser({ req, res, user });

  if (config.onUserSaved) await config.onUserSaved(user);

  const redirectResponse = await router.redirectTo({ req, res, url: callbackUrl });
  return redirectResponse;
}

export async function logoutAndRevokeTokenHandler({
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
  const { userAdapter, router, cookieStore } = checkConfig(config);

  // get the session cookie
  const cookieSession = (await cookieStore.getCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME }))?.find(
    (cookie) => cookie.name === DEFAULT_SESSION_COOKIE_NAME
  );
  if (!cookieSession) return await router.redirectTo({ req, res, url: callbackUrl });

  let session: LightAuthSession | null = null;
  try {
    session = (await decryptJwt(cookieSession.value)) as LightAuthSession;
  } catch (error) {}

  if (session) {
    // get the user from the session store
    const user = await userAdapter.getUser({ req, res, id: session.id });
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

    try {
      if (provider) {
        // delete the state cookie
        await cookieStore.deleteCookies({
          req,
          res,
          search: new RegExp(`^${provider.providerName}_(state|code_verifier)$`),
        });
      }

      // delete the user
      if (user) await userAdapter.deleteUser({ req, res, user });
      // delete the session cookie
      await cookieStore.deleteCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME });
    } catch {}
  }

  return await router.redirectTo({ req, res, url: callbackUrl });
}

/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function getSessionHandler({ config, req, res }: { config: LightAuthConfig; req?: BaseRequest; res?: BaseResponse }): Promise<Response> {
  const { cookieStore, router } = checkConfig(config);

  const cookieSession = (await cookieStore.getCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME }))?.find(
    (cookie) => cookie.name === DEFAULT_SESSION_COOKIE_NAME
  );
  if (!cookieSession) return await router.writeJson({ req, res, data: null });

  let session: LightAuthSession | null = null;

  try {
    session = (await decryptJwt(cookieSession.value)) as LightAuthSession;
  } catch (error) {
    console.error("Failed to decrypt session cookie:", error);
    return await router.writeJson({ req, res, data: null });
  }

  if (!session || !session.id || !session.userId) {
    console.error("Unable to read session:", session);
    return await router.writeJson({ req, res, data: null });
  }

  // check if session is expired
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    console.error("Session expired:", session.expiresAt);
    // delete the session cookie
    try {
      await cookieStore.deleteCookies({ req, res, search: DEFAULT_SESSION_COOKIE_NAME });
    } catch {}
    return await router.writeJson({ req, res, data: null });
  }

  // get the max age from the environment variable or use the default value
  let maxAge = getSessionExpirationMaxAge();
  const lowerLimitSessionRevalidationDate = new Date(Date.now() + (maxAge * 1000) / 2);
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > lowerLimitSessionRevalidationDate && now < expiresAt) {
    // we can update the session expiration time
    session.expiresAt = new Date(Date.now() + maxAge * 1000);
    // update the session cookie
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
          maxAge: maxAge, // 30 days,
          path: "/",
        },
      ],
    });
  }

  return await router.writeJson({ req, res, data: session });
}

export async function getUserHandler({
  config,
  req,
  res,
  id,
}: {
  config: LightAuthConfig;
  req?: BaseRequest;
  res?: BaseResponse;
  id: string;
}): Promise<Response> {
  const { router, userAdapter } = checkConfig(config);
  try {
    const user = await userAdapter.getUser({ req, res, id });
    if (user == null) return await router.writeJson({ req, res, data: null });
    return await router.writeJson({ req, res, data: user });
  } catch (error) {
    console.error("Failed to get user:", error);
    return await router.writeJson({ req, res, data: null });
  }
}

/**
 * Creates the HTTP handlers (get, set) function for LightAuth.
 * @param config The LightAuth configuration object.
 * @returns An HTTP handler function that processes requests and responses.
 */
export function createHttpHandlerFunction(config: LightAuthConfig) {
  const httpHandler = async (req: BaseRequest, res: BaseResponse): Promise<BaseResponse> => {
    if (!req) throw new Error("request is required");
    if (!config.router) throw new Error("router is required");

    const url = await config.router.getUrl({ req });

    const reqUrl = new URL(url);

    const basePath = config.basePath || "/"; // Default base path for the handlers
    const basePathSegments = basePath.split("/").filter((segment) => segment !== "");

    // Get the auth segments from the URL
    let pathname = reqUrl.pathname;

    let pathSegments = pathname.split("/").filter((segment) => segment !== "");
    // Remove all segments from basePathSegments, regardless of their index
    pathSegments = pathSegments.filter((segment) => !basePathSegments.includes(segment));

    // search callBack url
    const callbackUrl = reqUrl.searchParams.get("callbackUrl") ?? "/";

    let newResponse: BaseResponse | null = null;

    if (pathSegments.length < 1) throw new Error("Not enough path segments found");

    const providerName = pathSegments.length > 1 ? pathSegments[1] : null;

    if (pathSegments[0] === "session") {
      newResponse = await getSessionHandler({ req, res, config });
    } else if (pathSegments[0] === "user") {
      newResponse = await getUserHandler({ req, res, config, id: pathSegments[1] });
    } else if (pathSegments[0] === "login" && providerName) {
      newResponse = await redirectToProviderLoginHandler({ req, res, config, providerName });
    } else if (pathSegments[0] === "logout") {
      newResponse = await logoutAndRevokeTokenHandler({ req, res, config, revokeToken: false, callbackUrl });
    } else if (pathSegments[0] === "callback" && providerName) {
      newResponse = await providerCallbackHandler({ req, res, config, providerName, callbackUrl });
    }

    return newResponse ?? res;
  };
  return httpHandler;
}
