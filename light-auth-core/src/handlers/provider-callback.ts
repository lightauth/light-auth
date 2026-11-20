import { type LightAuthConfig, type LightAuthCookie, type LightAuthRouter, type LightAuthSession, type LightAuthUser } from "../models";
import { exchangeAuthorizationCode, getProviderProfile } from "../services/oauth-client";
import { checkConfig, getSessionExpirationMaxAge, sanitizeCallbackUrl } from "../services/utils";

// default access token lifetime when the provider does not return expires_in (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2.2)
const DEFAULT_ACCESS_TOKEN_EXPIRATION_MS = 3600 * 1000;

export async function providerCallbackHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  providerName?: string;
  /** Authorization response parameters, read from the query string when not set (form_post responses are posted) */
  callbackParameters?: URLSearchParams;
  [key: string]: unknown;
}): Promise<Response | undefined> {
  const { config, providerName } = args;
  let currentRouter: LightAuthRouter | null = null;
  let callbackUrl = "/";
  const { router, userAdapter, provider, sessionStore, env, basePath, sessionName } = checkConfig(config, providerName);
  try {
    currentRouter = router;

    // Credentials providers don't use OAuth callback
    if (provider.type === "credentials") {
      throw new Error("light-auth: Credentials provider should not use callback handler");
    }

    const callbackParameters = args.callbackParameters ?? new URL(await currentRouter.getUrl({ env, basePath, ...args })).searchParams;

    // get the cookies from headers
    const cookies = await currentRouter.getCookies({
      env,
      basePath,
      search: new RegExp(`^${provider.providerName}_light_auth_(code_verifier|state|nonce|callback_url)$`),
      ...args,
    });
    if (!cookies) throw new Error("light-auth: Cookies are missing from the request");

    const cookieValue = (name: string) => cookies.find((c) => c.name == `${provider.providerName}_light_auth_${name}`)?.value;
    const storedState = cookieValue("state");
    const codeVerifier = cookieValue("code_verifier");
    const nonce = cookieValue("nonce");

    callbackUrl = sanitizeCallbackUrl(cookieValue("callback_url"));

    if (!storedState) throw new Error("light-auth: the state cookie is missing, the sign in has expired or was not started from this browser");
    if (provider.pkce !== false && !codeVerifier) throw new Error("light-auth: the PKCE code verifier cookie is missing");

    // validates the state, exchanges the code (PKCE) and validates the id_token (signature, issuer, audience, expiration, nonce)
    let tokens = await exchangeAuthorizationCode(provider, { env, basePath, callbackParameters, expectedState: storedState, codeVerifier, nonce });

    if (provider.onGetOAuth2Tokens) tokens = await provider.onGetOAuth2Tokens(tokens, args);

    if (!tokens) throw new Error("light-auth: Failed to fetch tokens");

    const profile = await getProviderProfile(provider, tokens, callbackParameters);

    const id = sessionStore.generateSessionId();
    const maxAge = getSessionExpirationMaxAge();
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    let session = {
      id: id,
      providerUserId: profile.sub,
      email: profile.email,
      name: profile.name,
      expiresAt: expiresAt,
      providerName: provider.providerName,
    } as Session;

    if (config.onSessionSaving) {
      const sessionSaving = await config.onSessionSaving(session, tokens, args);
      session = sessionSaving ?? session;
    }

    session = await sessionStore.setSession({ env, basePath, sessionName, session, ...args });
    if (config.onSessionSaved) await config.onSessionSaved(session, args);

    if (userAdapter) {
      // Omit expiresAt from session when creating user
      const { expiresAt: sessionExpiresAt, id: sessionId, ...sessionWithoutExpiresAt } = session;
      let user = {
        ...sessionWithoutExpiresAt,
        picture: profile.picture,
        accessToken: tokens.accessToken,
        accessTokenExpiresAt: tokens.accessTokenExpiresAt ?? new Date(Date.now() + DEFAULT_ACCESS_TOKEN_EXPIRATION_MS),
        refreshToken: tokens.refreshToken,
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

    // Trigger onLogin event
    if (config.onLogin) await config.onLogin(session, provider.providerName);

    // delete the cookies
    try {
      const cookiesDelete: LightAuthCookie[] = ["state", "code_verifier", "nonce", "callback_url"].map((name) => ({
        name: `${provider.providerName}_light_auth_${name}`,
        value: "",
        path: "/",
        maxAge: 0,
      }));

      // delete the cookies
      await currentRouter.setCookies({ env, basePath, cookies: cookiesDelete, ...args });
    } catch (error) {}
  } catch (error) {
    // the full error, which may contain the id_token claims, is only given to onError
    console.error("Error in providerCallbackHandler:", error instanceof Error ? error.message : error);
    if (config.onError) await config.onError(error, "login");
  }

  // redirect to the callback URL
  // redirect is not in the try catch because we want to redirect even if there is an error
  // plus Next.JS router needs to be outside of the try catch
  if (currentRouter) return await currentRouter.redirectTo({ env, basePath, url: callbackUrl, ...args });
}
