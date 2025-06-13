import { type LightAuthConfig, type LightAuthUserAdapter, type LightAuthUser, type LightAuthSession, type LightAuthServerEnv } from "../models";
import { decryptJwt, encryptJwt } from "../services/jwt";
import { buildSecret } from "../services/utils";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";

/**
 * A concrete SessionStore implementation for Node.js server-side,
 * using the node:fs package to set, get, and delete session files.
 * Supports optional encryption of the session object.
 */

export const createLightAuthUserAdapter = ({ base, isEncrypted = false }: { base: string; isEncrypted: boolean }): LightAuthUserAdapter => {
  const sanitizeKey = (key: string): string => {
    return key.replace(/[^a-zA-Z0-9-_]/g, "_"); // Only allow alphanumeric, dash, and underscore for file safety
  };
  base = base || "./";
  return {
    async getUser<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
      userId,
      env,
    }: {
      env: LightAuthServerEnv;
      basePath: string;
      userId: string | number;
    }): Promise<User | null> {
      const safeId = sanitizeKey(userId.toString());
      const filePath = resolve(base, safeId + ".json");

      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) return null;

      try {
        const data = await fs.readFile(filePath, "utf-8");
        if (isEncrypted) {
          // Decrypt the stored JWT string to get the session object
          const payload = await decryptJwt(data, buildSecret(env));
          return payload as User;
        } else {
          // Parse the plain JSON session object
          return JSON.parse(data) as User;
        }
      } catch {
        return null;
      }
    },

    async setUser<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
      env,
      basePath,
      user,
    }: {
      env: LightAuthServerEnv;
      basePath: string;
      user: User;
    }): Promise<User> {
      if (!user?.userId) throw new Error("light-auth: user id is required");
      const safeId = sanitizeKey(user.userId.toString());
      const filePath = resolve(base, safeId + ".json");

      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      // some providers may not return the refresh token or access token, if you did not explicitly logout the last time
      // using the revokeToken option.
      if (exists) {
        const existingUser = await this.getUser({ env, basePath, userId: user.userId });
        if (existingUser && existingUser.userId === user.userId) {
          if (existingUser.refreshToken && !user.refreshToken) user.refreshToken = existingUser.refreshToken;
          if (existingUser.accessToken && !user.accessToken) {
            user.accessToken = existingUser.accessToken;
            user.accessTokenExpiresAt = existingUser.accessTokenExpiresAt;
          }
        }
      }

      await fs.mkdir(base, { recursive: true });
      if (isEncrypted) {
        // Encrypt the session object and store as a JWT string
        const jwt = await encryptJwt(user, buildSecret(env));
        await fs.writeFile(filePath, jwt, "utf-8");
      } else {
        // Store the session object as plain JSON
        await fs.writeFile(filePath, JSON.stringify(user), "utf-8");
      }
      return user;
    },

    async deleteUser<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
      user,
    }: {
      env: LightAuthServerEnv;
      basePath: string;
      user: User;
    }): Promise<void> {
      if (!user?.userId) return;
      const safeId = sanitizeKey(user.userId.toString());
      const filePath = resolve(base, safeId + ".json");

      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (!exists) return;

      try {
        await fs.unlink(filePath);
      } catch {
        // Ignore if file does not exist
      }
    },
  } satisfies LightAuthUserAdapter;
};
