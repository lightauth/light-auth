import { DEFAULT_SESSION_NAME } from "../constants";
import { LightAuthConfig, LightAuthSession } from "../models";
import { decryptJwt, encryptJwt } from "../services/jwt";
import { checkConfig, buildSecret, getSessionExpirationMaxAge } from "../services/utils";

/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function getSessionHandler(args: { config: LightAuthConfig; [key: string]: unknown }): Promise<Response> {
  const { config } = args;
  const { sessionStore, router } = checkConfig(config);

  const session = await sessionStore.getSession({ ...args });

  if (!session || !session.id || !session.userId) return await router.returnJson({ data: null, ...args });

  // check if session is expired
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    console.warn("Session expired:", session.expiresAt);
    // delete the session
    try {
      await sessionStore.deleteSession({ ...args });
    } catch {}
    return await router.returnJson({ data: null, ...args });
  }

  // get the max age from the environment variable or use the default value
  let maxAge = getSessionExpirationMaxAge();
  const lowerLimitSessionRevalidationDate = new Date(Date.now() + (maxAge * 1000) / 2);
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > lowerLimitSessionRevalidationDate && now < expiresAt) {
    // we can update the session expiration time
    session.expiresAt = new Date(Date.now() + maxAge * 1000);
    // update the session store
    await sessionStore.setSession({ ...args, session });
  }

  return await router.returnJson({ data: session, ...args });
}
