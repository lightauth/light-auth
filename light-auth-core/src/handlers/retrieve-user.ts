import { type LightAuthConfig, type LightAuthSession, type LightAuthTokens, type LightAuthUser } from "../models";
import { isInvalidGrantError, refreshTokens } from "../services/oauth-client";
import { checkConfig } from "../services/utils";
import { getSessionDirect } from "./retrieve-session";

// default access token lifetime when the provider does not return expires_in (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2.2)
const DEFAULT_ACCESS_TOKEN_EXPIRATION_MS = 3600 * 1000;

/**
 * Core logic to retrieve and refresh a user, without HTTP serialization.
 * Can be called directly from server-side code to avoid an internal HTTP round-trip.
 * Server-side code is trusted: any providerUserId can be requested, otherwise the user of the current (non-expired) session is returned.
 */
export async function getUserDirect<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  providerUserId?: string;
  [key: string]: unknown;
}): Promise<User | null> {
  const { config, providerUserId, ...restArgs } = args;
  const { userAdapter, provider, env, basePath } = checkConfig(config);
  try {
    let providerUserIdId: string | null | undefined = providerUserId;

    if (!providerUserIdId) {
      const session = await getSessionDirect<Session, User>({ ...args, config });
      providerUserIdId = session?.providerUserId?.toString();
    }

    if (!providerUserIdId) return null;

    let user = await userAdapter.getUser<Session, User>({ env, basePath, providerUserId: providerUserIdId, ...restArgs });

    if (!user) return null;

    // Resolve the correct provider based on the user's providerName, not the default first provider
    const userProvider = config.providers?.find((p) => p.providerName.toLowerCase() === user!.providerName?.toLowerCase()) ?? provider;

    // Only check token expiration for OAuth providers (credentials providers don't have access tokens)
    if (userProvider.type === "oauth") {
      const accessTokenExpiresAt = user?.accessTokenExpiresAt ? new Date(user.accessTokenExpiresAt) : new Date();

      // lower limit before trying to refresh the token is 10 minutes
      const lowerLimitSessionRevalidationDate = new Date(accessTokenExpiresAt.getTime() - 10 * 60 * 1000);
      const now = new Date();

      if (now > lowerLimitSessionRevalidationDate) {
        // Token is expired or about to expire — attempt to refresh if possible
        if (user?.refreshToken) {
          let tokens: LightAuthTokens | null = null;
          try {
            tokens = await refreshTokens(userProvider, user.refreshToken);
          } catch (error) {
            console.warn("Error refreshing access token:", error instanceof Error ? error.message : error);

            // If the refresh token is permanently invalid, clear it to prevent
            // retrying on every subsequent request
            if (isInvalidGrantError(error)) {
              user.refreshToken = undefined;
              user.accessToken = undefined;
              user.accessTokenExpiresAt = undefined;
              await userAdapter.setUser({ env, basePath, user, ...args });
            }
          }

          if (tokens) {
            if (userProvider.onGetOAuth2Tokens) tokens = await userProvider.onGetOAuth2Tokens(tokens, args);

            // update the user, keeping the current refresh token when the provider does not rotate it
            user.accessToken = tokens.accessToken;
            user.accessTokenExpiresAt = tokens.accessTokenExpiresAt ?? new Date(Date.now() + DEFAULT_ACCESS_TOKEN_EXPIRATION_MS);
            if (tokens.refreshToken) user.refreshToken = tokens.refreshToken;
            // update the user in the store
            if (config.onUserSaving) {
              const userSaving = await config.onUserSaving(user, tokens, args);
              // if the user is not null, use it
              // if the user is null, use the original user
              user = userSaving ?? user;
            }
            user = await userAdapter.setUser({ env, basePath, user, ...args });

            if (config.onUserSaved) await config.onUserSaved(user, args);
            if (config.onTokenRefresh) await config.onTokenRefresh(user, userProvider.providerName);
          }
        }
      }
    }

    return user ?? null;
  } catch (error) {
    console.error("Failed to get user:", error);
    return null;
  }
}

/**
 * User handler available on endpoint /${basePath}/user[/:providerUserId], reachable from the browser.
 * Only the owner of a valid session can read its own user, and OAuth tokens never leave the server.
 */
export async function getUserHandler<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  providerUserId?: string;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, providerUserId } = args;
  const { router, env, basePath } = checkConfig(config);

  const session = await getSessionDirect<Session, User>({ ...args, config });
  if (!session) return await router.returnJson({ env, basePath, data: null, ...args });

  const sessionProviderUserId = session.providerUserId.toString();
  if (providerUserId && providerUserId !== sessionProviderUserId)
    return await router.returnJson({ env, basePath, data: { error: "Forbidden" }, init: { status: 403 }, ...args });

  const user = await getUserDirect<Session, User>({ ...args, config, providerUserId: sessionProviderUserId });
  if (!user) return await router.returnJson({ env, basePath, data: null, ...args });

  const { accessToken, refreshToken, accessTokenExpiresAt, ...publicUser } = user;
  return await router.returnJson({ env, basePath, data: publicUser, ...args });
}
