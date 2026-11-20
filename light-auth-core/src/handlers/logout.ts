import { type LightAuthConfig, type LightAuthCookie, type LightAuthSession, type LightAuthUser } from "../models";
import { CSRF_COOKIE_NAME, validateCsrfToken } from "../services";
import { revokeProviderToken } from "../services/oauth-client";
import { buildSecret, checkConfig, sanitizeCallbackUrl } from "../services/utils";

export async function logoutAndRevokeTokenHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  revokeToken?: boolean;
  callbackUrl?: string;
  checkCsrf?: boolean;
  csrfToken?: string | null;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, revokeToken = true, checkCsrf = true } = args;
  const callbackUrl = sanitizeCallbackUrl(args.callbackUrl);

  const { userAdapter, router, sessionStore, env, basePath, sessionName } = checkConfig(config);

  // get the session
  const session = await sessionStore.getSession({ env, basePath, sessionName, ...args });

  if (!session || !session.id) return await router.redirectTo({ env, basePath, ...args, url: callbackUrl });

  // Check if CSRF validation is required
  // it could be disable for direct call from a post action issued by the SSR framework
  if (checkCsrf) {
    const secret = buildSecret(env);
    const cookies = await router.getCookies({ env, basePath, ...args });
    const csrfIsValid = await validateCsrfToken(cookies, secret, args.csrfToken);
    if (!csrfIsValid) throw new Error("Invalid CSRF token");
  }

  // get the provider name from the session
  const providerName = session?.providerName;
  // get the provider from the config
  const provider = config.providers?.find((p) => p.providerName === providerName);

  // get the user from the session store
  if (userAdapter) {
    const user = await userAdapter.getUser({ env, basePath, providerUserId: session.providerUserId.toString(), ...args });

    if (user) {
      // delete the user
      await userAdapter.deleteUser({ env, basePath, user, ...args });

      // revoke the tokens if the provider supports it (OAuth providers only):
      // the refresh token first, revoking it usually invalidates the access tokens issued with it
      if (provider && revokeToken && provider.type === "oauth") {
        const tokensToRevoke = [
          { token: user.refreshToken, tokenTypeHint: "refresh_token" as const },
          { token: user.accessToken, tokenTypeHint: "access_token" as const },
        ];
        for (const { token, tokenTypeHint } of tokensToRevoke) {
          if (!token) continue;
          try {
            await revokeProviderToken(provider, token, tokenTypeHint);
          } catch (e) {
            console.warn(`Failed to revoke ${tokenTypeHint}:`, e instanceof Error ? e.message : e);
          }
        }
      }
    }
  }

  // Trigger onLogout event
  if (config.onLogout) {
    try {
      await config.onLogout(session as Session, session.providerName ?? "");
    } catch (e) {
      console.warn("Error in onLogout hook:", e);
    }
  }

  try {
    // delete the session cookie
    await sessionStore.deleteSession({ env, basePath, sessionName, session, ...args });
  } catch {}

  try {
    const cookiesDelete: LightAuthCookie[] = ["state", "code_verifier", "nonce", "callback_url"].map((name) => ({
      name: `${providerName}_light_auth_${name}`,
      value: "",
      path: "/",
      maxAge: 0,
    }));
    cookiesDelete.push({ name: CSRF_COOKIE_NAME, value: "", path: "/", maxAge: 0 });

    // delete the cookies
    await router.setCookies({ env, basePath, cookies: cookiesDelete, ...args });
  } catch {}

  return await router.redirectTo({ env, basePath, ...args, url: callbackUrl });
}
