import { generateState, generateCodeVerifier, decodeIdToken } from "arctic";

import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseResponse } from "../models/light-auth-base";
import { buildSecret, checkConfig, getSessionExpirationMaxAge } from "../services/utils";
import { LightAuthSession, LightAuthUser } from "../models/light-auth-session";
import { decryptJwt, encryptJwt } from "../services/jwt";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";

export async function logoutAndRevokeTokenHandler(args: {
  config: LightAuthConfig;
  revokeToken?: boolean;
  callbackUrl?: string;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, revokeToken = true, callbackUrl = "/" } = args;
  const { userAdapter, router, cookieStore } = checkConfig(config);

  // get the session cookie
  const cookieSession = (await cookieStore.getCookies({ search: DEFAULT_SESSION_COOKIE_NAME, ...args }))?.find(
    (cookie) => cookie.name === DEFAULT_SESSION_COOKIE_NAME
  );

  if (!cookieSession) return await router.redirectTo({ url: callbackUrl, ...args });

  let session: LightAuthSession | null = null;
  try {
    session = (await decryptJwt(cookieSession.value, buildSecret(config.env))) as LightAuthSession;
  } catch (error) {}

  if (!session || !session.id || !session.userId) {
    return await router.redirectTo({ url: callbackUrl, ...args });
  }

  // get the provider name from the session
  const providerName = session?.providerName;
  // get the provider from the config
  const provider = config.providers.find((p) => p.providerName === providerName);

  // get the user from the session store
  if (userAdapter) {
    const user = await userAdapter.getUser({ id: session.id, ...args });

    if (user) {
      // delete the user
      if (user) await userAdapter.deleteUser({ user, ...args });

      var token = user?.accessToken;

      // revoke the token if the provider supports it
      if (token && provider && revokeToken) {
        console.log("Revoking token:", token);
        // Revoke the token if the provider supports it
        if (typeof provider.artic.revokeToken === "function") {
          try {
            await provider.artic.revokeToken(token);
          } catch (e) {
            console.warn("Failed to revoke token:", e);
          }
        }
      }
    }
  }

  try {
    if (provider) {
      // delete the state cookie
      await cookieStore.deleteCookies({
        search: new RegExp(`^${provider.providerName}_light_auth_(state|code_verifier)$`),
        ...args,
      });
    }

    // delete the session cookie
    await cookieStore.deleteCookies({ search: DEFAULT_SESSION_COOKIE_NAME, ...args });
  } catch {}

  return await router.redirectTo({ url: callbackUrl, ...args });
}
