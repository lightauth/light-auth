import { type LightAuthConfig, type LightAuthCookie, type LightAuthSession, type LightAuthUser } from "../models";
import { validateCsrfToken } from "../services";
import { buildSecret, checkConfig } from "../services/utils";

export async function logoutAndRevokeTokenHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  revokeToken?: boolean;
  callbackUrl?: string;
  checkCsrf?: boolean;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, revokeToken = true, callbackUrl = "/", checkCsrf = true } = args;

  const { userAdapter, router, sessionStore, env } = checkConfig(config);

  // get the session
  const session = await sessionStore.getSession({ ...args });

  if (!session || !session.id) return await router.redirectTo({ url: callbackUrl, ...args });

  // Check if CSRF validation is required
  // it could be disable for direct call from a post action issued by the SSR framework
  if (checkCsrf) {
    const secret = buildSecret(env);
    const cookies = await router.getCookies({ ...args });
    const csrfIsValid = validateCsrfToken(cookies, secret);
    if (!csrfIsValid) throw new Error("Invalid CSRF token");
  }

  // get the provider name from the session
  const providerName = session?.providerName;
  // get the provider from the config
  const provider = config.providers?.find((p) => p.providerName === providerName);

  // get the user from the session store
  if (userAdapter) {
    const user = await userAdapter.getUser({ userId: session.userId.toString(), ...args });

    if (user) {
      // delete the user
      if (user) await userAdapter.deleteUser({ user, ...args });

      var token = user?.accessToken;

      // revoke the token if the provider supports it
      if (token && provider && revokeToken) {
        // Revoke the token if the provider supports it
        if (typeof provider.arctic.revokeToken === "function") {
          try {
            await provider.arctic.revokeToken(token);
          } catch (e) {
            console.warn("Failed to revoke token:", e);
          }
        }
      }
    }
  }

  try {
    // delete the session cookie
    await sessionStore.deleteSession({ ...args });
  } catch {}

  try {
    const stateCookieDelete: LightAuthCookie = { name: `${providerName}_light_auth_state`, value: "", path: "/", maxAge: 0 };
    const codeVerifierCookieDelete: LightAuthCookie = { name: `${providerName}_light_auth_code_verifier`, value: "", path: "/", maxAge: 0 };
    const callbackUrlCookieDelete: LightAuthCookie = { name: `${providerName}_light_auth_callback_url`, value: "", path: "/", maxAge: 0 };
    const csrfCookieDelete: LightAuthCookie = { name: "light_auth_csrf_token", value: "", maxAge: 0 };

    // delete the cookies
    await router.setCookies({ cookies: [stateCookieDelete, codeVerifierCookieDelete, callbackUrlCookieDelete, csrfCookieDelete], ...args });
  } catch {}

  return await router.redirectTo({ url: callbackUrl, ...args });
}
