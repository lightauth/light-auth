import { base64url } from "jose";
import { type LightAuthUserAdapter, type LightAuthUser, type LightAuthSession, type LightAuthServerEnv } from "../models";
import { decryptJwt, encryptJwt } from "../services/jwt";
import { buildSecret } from "../services/utils";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

/**
 * A concrete user adapter for Node.js server-side, storing each user in a JSON file (optionally encrypted) with the node:fs package.
 */
export const createLightAuthUserAdapter = ({ base, isEncrypted = false }: { base: string; isEncrypted: boolean }): LightAuthUserAdapter => {
  base = base || "./";

  // base64url keeps the file name safe and distinct for each id ("a.b" and "a_b" used to share the same file)
  const userFilePath = (providerUserId: string | number) => resolve(base, `${base64url.encode(providerUserId.toString())}.json`);
  // file name used by previous versions, still read so that existing users keep their tokens
  const legacyUserFilePath = (providerUserId: string | number) => resolve(base, `${providerUserId.toString().replace(/[^a-zA-Z0-9-_]/g, "_")}.json`);

  const readUserFile = async <User extends LightAuthUser<LightAuthSession>>(filePath: string, env: LightAuthServerEnv): Promise<User | null> => {
    let data: string;
    try {
      data = await fs.readFile(filePath, "utf-8");
    } catch {
      return null;
    }
    try {
      // encrypted users are stored as a JWE, plain users as JSON
      return (isEncrypted ? await decryptJwt(data, buildSecret(env)) : JSON.parse(data)) as User;
    } catch {
      return null;
    }
  };

  const getUser = async <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
    providerUserId,
    env,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    providerUserId: string | number;
  }): Promise<User | null> => {
    const user = await readUserFile<User>(userFilePath(providerUserId), env);
    if (user) return user;

    // a legacy file may belong to another id mapped to the same name: only return it for the exact same id
    const legacyUser = await readUserFile<User>(legacyUserFilePath(providerUserId), env);
    return legacyUser && String(legacyUser.providerUserId) === String(providerUserId) ? legacyUser : null;
  };

  const deleteLegacyUserFile = async (providerUserId: string | number, env: LightAuthServerEnv) => {
    const legacyFilePath = legacyUserFilePath(providerUserId);
    if (legacyFilePath === userFilePath(providerUserId)) return;
    const legacyUser = await readUserFile(legacyFilePath, env);
    if (legacyUser && String(legacyUser.providerUserId) === String(providerUserId)) await fs.rm(legacyFilePath, { force: true });
  };

  return {
    getUser,

    async setUser<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
      env,
      basePath,
      user,
    }: {
      env: LightAuthServerEnv;
      basePath: string;
      user: User;
    }): Promise<User> {
      if (!user?.providerUserId) throw new Error("light-auth: user id is required");

      // some providers may not return the refresh token or access token, if you did not explicitly logout the last time
      // using the revokeToken option.
      const existingUser = await getUser<Session, User>({ env, basePath, providerUserId: user.providerUserId });
      if (existingUser) {
        if (existingUser.refreshToken && !user.refreshToken) user.refreshToken = existingUser.refreshToken;
        if (existingUser.accessToken && !user.accessToken) {
          user.accessToken = existingUser.accessToken;
          user.accessTokenExpiresAt = existingUser.accessTokenExpiresAt;
        }
      }

      await fs.mkdir(base, { recursive: true });
      const data = isEncrypted ? await encryptJwt(user, buildSecret(env)) : JSON.stringify(user);
      await fs.writeFile(userFilePath(user.providerUserId), data, "utf-8");

      // the user is migrated to the new file name
      await deleteLegacyUserFile(user.providerUserId, env);
      return user;
    },

    async deleteUser<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
      env,
      user,
    }: {
      env: LightAuthServerEnv;
      basePath: string;
      user: User;
    }): Promise<void> {
      if (!user?.providerUserId) return;
      await fs.rm(userFilePath(user.providerUserId), { force: true });
      await deleteLegacyUserFile(user.providerUserId, env);
    },
  } satisfies LightAuthUserAdapter;
};
