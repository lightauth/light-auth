import { type LightAuthConfig, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge } from "../services/utils";

/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function getSessionHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: { config: LightAuthConfig<Session, User>; [key: string]: unknown }): Promise<Response> {
  const { config } = args;
  const { sessionStore, router, basePath, env } = checkConfig<Session, User>(config);

  const session = await sessionStore.getSession<Session>({
    env,
    basePath,
    ...args,
  });

  if (!session || !session.id || !session.userId) return await router.returnJson({ env, basePath, data: {}, ...args });

  // check if session is expired
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    console.warn("Session expired:", session.expiresAt);
    // delete the session
    try {
      await sessionStore.deleteSession({ env, basePath, session, ...args });
    } catch {}
    return await router.returnJson({ env, basePath, data: {}, ...args });
  }

  // get the max age from the environment variable or use the default value
  let maxAge = getSessionExpirationMaxAge();
  const lowerLimitSessionRevalidationDate = new Date(Date.now() + (maxAge * 1000) / 2);
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > lowerLimitSessionRevalidationDate) {
    // we can update the session expiration time
    session.expiresAt = new Date(Date.now() + maxAge * 1000);
    // update the session store
    await sessionStore.setSession({ env, basePath, ...args, session });
  }

  return await router.returnJson({ env, basePath, data: session, ...args });
}
