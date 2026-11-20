import { type LightAuthConfig, type LightAuthSession, type LightAuthUser } from "../models";
import { checkConfig } from "../services/utils";

/**
 * Saves a user in-process, for trusted server-side code only.
 * Never expose it through an HTTP endpoint: the user content (including tokens) is not validated.
 */
export async function setUserDirect<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  user: User;
  [key: string]: unknown;
}): Promise<User | null> {
  const { config } = args;
  let { user } = args;
  const { userAdapter, basePath, env } = checkConfig<Session, User>(config);

  if (!userAdapter) throw new Error("light-auth: userAdapter is required to save a user");
  if (!user || !user.providerUserId) return null;

  if (config.onUserSaving) {
    const userSaving = await config.onUserSaving(user, undefined, args);
    user = userSaving ?? user;
  }

  user = await userAdapter.setUser({ env, basePath, ...args, user });

  if (config.onUserSaved) await config.onUserSaved(user, args);
  return user;
}
