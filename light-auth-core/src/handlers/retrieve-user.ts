import type { OAuth2Tokens } from "arctic";
import { type LightAuthConfig, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig } from "../services/utils";

export async function getUserHandler<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  userId: string;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, userId, ...restArgs } = args;
  const { router, userAdapter, provider, env, basePath, sessionStore } = checkConfig(config);
  try {
    let userIdId: string | null | undefined = userId;

    if (!userIdId) {
      const session = await sessionStore.getSession<Session>({ env, basePath, ...args });
      userIdId = session?.userId?.toString();
    }

    if (!userIdId) return await router.returnJson({ env, basePath, data: null, ...args });

    let user = await userAdapter.getUser<Session, User>({ env, basePath, userId: userIdId, ...restArgs });

    if (!user) return await router.returnJson({ env, basePath, data: null, ...args });

    const accessTokenExpiresAt = user?.accessTokenExpiresAt ? new Date(user.accessTokenExpiresAt) : new Date();

    // lower limit before trying to refresh the token is 10 minutes
    const lowerLimitSessionRevalidationDate = new Date(accessTokenExpiresAt.getTime() - 10 * 60 * 1000);
    const now = new Date();

    // check if we are over the limit, and if we have a refresh token
    if (now > lowerLimitSessionRevalidationDate && user?.refreshToken) {
      // Using Set to ensure unique scopes
      // and adding default scopes
      const scopeSet = new Set(provider.scopes ?? []);
      scopeSet.add("openid");
      scopeSet.add("profile");
      scopeSet.add("email");
      const scopes = Array.from(scopeSet);

      // we can update the session expiration time
      if (provider.arctic && typeof provider.arctic.refreshAccessToken === "function") {
        let tokens: OAuth2Tokens | null = null;
        try {
          tokens = await provider.arctic.refreshAccessToken(user.refreshToken, scopes);
        } catch (error) {
          if (typeof error === "object" && error !== null) {
            let code = "code" in error && typeof error.code === "string" ? error.code : "unknown_error";
            let description = "description" in error && typeof error.description === "string" ? error.description : "unknown_error";
            console.warn("Error refreshing access token:", code, description);
          }
        }

        if (tokens) {
          if (provider.onGetOAuth2Tokens) tokens = await provider.onGetOAuth2Tokens(tokens, args);

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
          let refresh_token: string | undefined;
          if (tokens.hasRefreshToken()) refresh_token = tokens.refreshToken();
          // update the user
          user.accessToken = accessToken;
          user.accessTokenExpiresAt = accessTokenExpiresAt;
          if (refresh_token) user.refreshToken = refresh_token;
          // update the user in the store
          if (config.onUserSaving) {
            const userSaving = await config.onUserSaving(user, tokens, args);
            // if the user is not null, use it
            // if the user is null, use the original user
            user = userSaving ?? user;
          }
          await userAdapter.setUser({ env, basePath, user, ...args });

          if (config.onUserSaved) await config.onUserSaved(user, args);
        }
      }
    }

    if (user == null) return await router.returnJson({ env, basePath, data: null, ...args });
    return await router.returnJson({ env, basePath, data: user, ...args });
  } catch (error) {
    console.error("Failed to get user:", error);
    return await router.returnJson({ env, basePath, data: null, ...args });
  }
}
