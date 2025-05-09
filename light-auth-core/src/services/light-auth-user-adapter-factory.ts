import { LightAuthConfig, LightAuthUserAdapter, LightAuthUser } from "../models";
import { decryptJwt, encryptJwt } from "./jwt";
import { buildSecret } from "./utils";
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
    async getUser({ config, id }: { config: LightAuthConfig; id: string }): Promise<LightAuthUser | null> {
      const safeId = sanitizeKey(id);
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
          const payload = await decryptJwt(data, buildSecret(config.env));
          return payload as LightAuthUser;
        } else {
          // Parse the plain JSON session object
          return JSON.parse(data) as LightAuthUser;
        }
      } catch {
        return null;
      }
    },

    async setUser({ config, user }: { config: LightAuthConfig; user: LightAuthUser }): Promise<void> {
      if (!user?.id) throw new Error("light-auth: Session must have an id");
      const safeId = sanitizeKey(user.id);
      const filePath = resolve(base, safeId + ".json");
      await fs.mkdir(base, { recursive: true });
      if (isEncrypted) {
        // Encrypt the session object and store as a JWT string
        const jwt = await encryptJwt(user, buildSecret(config.env));
        await fs.writeFile(filePath, jwt, "utf-8");
      } else {
        // Store the session object as plain JSON
        await fs.writeFile(filePath, JSON.stringify(user), "utf-8");
      }
    },

    async deleteUser({ config, user }: { config: LightAuthConfig; user: LightAuthUser }): Promise<void> {
      if (!user?.id) return;
      const safeId = sanitizeKey(user.id);
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
