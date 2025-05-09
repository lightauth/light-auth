import { LightAuthConfig } from "../models";
import { checkConfig } from "../services/utils";

export async function logoutAndRevokeTokenHandler(args: {
  config: LightAuthConfig;
  revokeToken?: boolean;
  callbackUrl?: string;
  [key: string]: unknown;
}): Promise<Response> {
  const { config, revokeToken = true, callbackUrl = "/" } = args;
  const { userAdapter, router, sessionStore } = checkConfig(config);

  // get the session
  const session = await sessionStore.getSession({ ...args });

  if (!session || !session.id) return await router.redirectTo({ url: callbackUrl, ...args });

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
    // delete the session cookie
    await sessionStore.deleteSession({ ...args });
  } catch {}

  return await router.redirectTo({ url: callbackUrl, ...args });
}
