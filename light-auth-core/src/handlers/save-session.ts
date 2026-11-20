import { type LightAuthConfig, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge, shouldRenewSession } from "../services/utils";

/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function setSessionHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: { config: LightAuthConfig<Session, User>; session: Session; [key: string]: unknown }): Promise<Response> {
  const { config } = args;
  let { session } = args;
  const { sessionStore, router, basePath, env, sessionName } = checkConfig<Session, User>(config);

  if (!session || !session.id || !session.providerUserId) return await router.returnJson({ env, basePath, data: null, ...args });

  // get the max age from the environment variable or use the default value
  const maxAge = getSessionExpirationMaxAge();
  if (shouldRenewSession(session, maxAge)) session.expiresAt = new Date(Date.now() + maxAge * 1000);

  if (config.onSessionSaving) {
    const sessionSaving = await config.onSessionSaving(session, undefined, args);
    session = sessionSaving ?? session;
  }

  session = await sessionStore.setSession({ env, basePath, sessionName, ...args, session });
  if (config.onSessionSaved) await config.onSessionSaved(session, args);

  return await router.returnJson({ env, basePath, data: session, ...args });
}
