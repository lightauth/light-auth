import { type LightAuthConfig, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig, getSessionExpirationMaxAge } from "../services/utils";

/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function setUserHandler<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  user: User;
  [key: string]: unknown;
}): Promise<Response> {
  const { config } = args;
  let { user } = args;
  const { userAdapter, router, basePath, env } = checkConfig<Session, User>(config);

  if (!user || !user.providerUserId) return await router.returnJson({ env, basePath, data: null, ...args });

  if (config.onUserSaving) {
    const userSaving = await config.onUserSaving(user, undefined, args);
    user = userSaving ?? user;
  }

  user = await userAdapter.setUser({ env, basePath, ...args, user });

  if (config.onUserSaved) await config.onUserSaved(user, args);
  return await router.returnJson({ env, basePath, data: user, ...args });
}
