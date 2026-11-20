import { type LightAuthConfig, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge, isSessionExpired, shouldRenewSession } from "../services/utils";

/**
 * Reads the current session in-process, without any HTTP round-trip.
 * Returns null when there is no valid, non-expired session. Read-only: renewal only happens through the /session endpoint.
 */
export async function getSessionDirect<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  [key: string]: unknown;
}): Promise<Session | null> {
  const { config } = args;
  const { sessionStore, basePath, env, sessionName } = checkConfig<Session, User>(config);

  const session = await sessionStore.getSession<Session>({ env, basePath, sessionName, ...args });
  if (!session || !session.id || !session.providerUserId || isSessionExpired(session)) return null;

  return session;
}

/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function getSessionHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: { config: LightAuthConfig<Session, User>; [key: string]: unknown }): Promise<Response> {
  const { config } = args;
  const { sessionStore, router, basePath, env, sessionName } = checkConfig<Session, User>(config);

  let session = await sessionStore.getSession<Session>({
    env,
    basePath,
    sessionName,
    ...args,
  });

  if (!session || !session.id || !session.providerUserId) return await router.returnJson({ env, basePath, data: null, ...args });

  // check if session is expired (a missing or invalid expiresAt counts as expired)
  if (isSessionExpired(session)) {
    console.warn("Session expired:", session.expiresAt);
    if (config.onSessionExpired) {
      try { await config.onSessionExpired(session); } catch {}
    }
    // delete the session
    try {
      await sessionStore.deleteSession({ env, basePath, sessionName, session, ...args });
    } catch {}
    return await router.returnJson({ env, basePath, data: null, ...args });
  }

  // get the max age from the environment variable or use the default value
  const maxAge = getSessionExpirationMaxAge();

  if (shouldRenewSession(session, maxAge)) {
    // we can update the session expiration time
    session.expiresAt = new Date(Date.now() + maxAge * 1000);

    if (config.onSessionSaving) {
      const sessionSaving = await config.onSessionSaving(session, undefined, args);
      session = sessionSaving ?? session;
    }

    // update the session store
    session = await sessionStore.setSession({ env, basePath, sessionName, ...args, session });
    if (config.onSessionSaved) await config.onSessionSaved(session, args);
  }

  return await router.returnJson({ env, basePath, data: session, ...args });
}
