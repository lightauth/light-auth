import { decodeIdToken } from "arctic";
import { type LightAuthConfig, type LightAuthCookie, type LightAuthRouter, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge } from "../services/utils";

export async function providerCallbackHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: { config: LightAuthConfig<Session, User>; providerName?: string; [key: string]: unknown }): Promise<Response | undefined> {
  const { config, providerName } = args;
  let currentRouter: LightAuthRouter | null = null;
  let callbackUrl = "/";
  const { router, userAdapter, provider, sessionStore, env, basePath } = checkConfig(config, providerName);
  try {
    currentRouter = router;

    // Credentials providers don't use OAuth callback
    if (provider.type === "credentials") {
      throw new Error("light-auth: Credentials provider should not use callback handler");
    }

    const url = await currentRouter.getUrl({ env, basePath, ...args });
    const reqUrl = new URL(url);
    const code = reqUrl.searchParams.get("code");
    const state = reqUrl.searchParams.get("state");

    if (code === null || state === null) throw new Error("light-auth: state or code are missing from the request");

    // get the cookies from headers
    const cookies = await currentRouter.getCookies({
      env,
      basePath,
      search: new RegExp(`^${provider.providerName}_light_auth_(code_verifier|state|callback_url)$`),
      ...args,
    });
    if (!cookies) throw new Error("light-auth: Cookies are missing from the request");

    const storedStateCookie = cookies.find((c) => c.name == `${provider.providerName}_light_auth_state`)?.value;
    const codeVerifierCookie = cookies.find((c) => c.name == `${provider.providerName}_light_auth_code_verifier`)?.value;
    const callbackUrlCookie = cookies.find((c) => c.name == `${provider.providerName}_light_auth_callback_url`)?.value;

    callbackUrl = callbackUrlCookie ?? "/";

    if (storedStateCookie == null || codeVerifierCookie == null) throw new Error("light-auth: Invalid state or code verifier or callback URL");

    // validate the state
    if (storedStateCookie !== state) throw new Error("light-auth: Invalid state");

    // validate the authorization code
    let tokens = await provider.arctic.validateAuthorizationCode(code, codeVerifierCookie);

    if (provider.onGetOAuth2Tokens) tokens = await provider.onGetOAuth2Tokens(tokens, args);

    if (tokens === null) throw new Error("light-auth: Failed to fetch tokens");

    // Calculate the access token expiration time
    // The access token expiration time is the number of seconds until the token expires
    // The default expiration time is 3600 seconds (1 hour)
    // https://www.ietf.org/rfc/rfc6749.html#section-4.2.2
    let accessTokenExpiresIn: number = 3600; // default to 1 hour
    if ("expires_in" in tokens.data && typeof tokens.data.expires_in === "number") {
      accessTokenExpiresIn = Number(tokens.data.expires_in);
    }
    const accessTokenExpiresAt = new Date(Date.now() + accessTokenExpiresIn * 1000);

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

    const id = sessionStore.generateSessionId();
    const maxAge = getSessionExpirationMaxAge();
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    let session = {
      id: id,
      providerUserId: claims.sub,
      email: claims.email,
      name: claims.name,
      expiresAt: expiresAt, // 30 days
      providerName: provider.providerName,
    } as Session;

    if (config.onSessionSaving) {
      const sessionSaving = await config.onSessionSaving(session, tokens, args);
      session = sessionSaving ?? session;
    }

    session = await sessionStore.setSession({ env, basePath, session, ...args });
    if (config.onSessionSaved) await config.onSessionSaved(session, args);

    if (userAdapter) {
      // Omit expiresAt from session when creating user
      const { expiresAt: sessionExpiresAt, id: sessionId, ...sessionWithoutExpiresAt } = session;
      let user = {
        ...sessionWithoutExpiresAt,
        picture: claims.picture,
        accessToken: accessToken,
        accessTokenExpiresAt: new Date(accessTokenExpiresAt),
        refreshToken: refresh_token,
      } as User;

      if (config.onUserSaving) {
        const userSaving = await config.onUserSaving(user, tokens, args);
        // if the user is not null, use it
        // if the user is null, use the original user
        user = userSaving ?? user;
      }
      user = await userAdapter.setUser({ user, env, basePath, ...args });

      if (config.onUserSaved) await config.onUserSaved(user, args);
    }
    // delete the cookies
    try {
      const stateCookieDelete: LightAuthCookie = { name: `${provider.providerName}_light_auth_state`, value: "", path: "/", maxAge: 0 };
      const codeVerifierCookieDelete: LightAuthCookie = { name: `${provider.providerName}_light_auth_code_verifier`, value: "", path: "/", maxAge: 0 };
      const callbackUrlCookieDelete: LightAuthCookie = { name: `${provider.providerName}_light_auth_callback_url`, value: "", path: "/", maxAge: 0 };

      // delete the cookies
      await currentRouter.setCookies({ env, basePath, cookies: [stateCookieDelete, codeVerifierCookieDelete, callbackUrlCookieDelete], ...args });
    } catch (error) {}
  } catch (error) {
    console.error("Error in providerCallbackHandler:", error);
  }

  // redirect to the callback URL
  // redirect is not in the try catch because we want to redirect even if there is an error
  // plus Next.JS router needs to be outside of the try catch
  if (currentRouter) return await currentRouter.redirectTo({ env, basePath, url: callbackUrl, ...args });
}
