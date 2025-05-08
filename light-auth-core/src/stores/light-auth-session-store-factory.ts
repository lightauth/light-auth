import * as cookieParser from "cookie";
import { LightAuthConfig, LightAuthSession, LightAuthSessionStore } from "../models";
import { DEFAULT_SESSION_NAME } from "../constants";
import { buildSecret, decryptJwt, encryptJwt, getSessionExpirationMaxAge } from "../services";

export const createLightAuthSessionStore = (): LightAuthSessionStore => {
  return {
    getSession: async ({ config, req }: { config: LightAuthConfig; req?: Request }): Promise<LightAuthSession | null> => {
      if (!req) throw new Error("light-auth: Request is required in getSession function of light-auth session store");

      const cookieHeader = req.headers.get("Cookie");
      if (!cookieHeader) return null;

      const requestCookies = cookieParser.parse(cookieHeader);
      if (!requestCookies) return null;

      const session = requestCookies[DEFAULT_SESSION_NAME];
      if (!session) return null;

      try {
        const decryptedSession = await decryptJwt(session, buildSecret(config.env));
        return decryptedSession as LightAuthSession;
      } catch (error) {
        console.error("Failed to decrypt session:", error);
        return null;
      }
    },
    setSession: async ({ config, session, res }: { config: LightAuthConfig; session: LightAuthSession; res?: Response }) => {
      if (!res) throw new Error("light-auth: Response is required in setSession of light-auth session store");

      const value = await encryptJwt(session, buildSecret(config.env));

      // Check the size of the cookie value in bytes
      const encoder = new TextEncoder();
      const valueBytes = encoder.encode(value);

      if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

      // get the cookie expiration time
      const maxAge = getSessionExpirationMaxAge();

      const cookieString = cookieParser.serialize(DEFAULT_SESSION_NAME, value, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: maxAge,
      });

      res.headers.append("Set-Cookie", cookieString);

      return res;
    },
    deleteSession: async ({ config, res }: { config: LightAuthConfig; res?: Response }) => {
      if (!res) throw new Error("light-auth: Response is required in deleteSessions of light-auth session store");

      const serialized = cookieParser.serialize(DEFAULT_SESSION_NAME, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      res.headers.append("Set-Cookie", serialized);

      return res;
    },
    generateSessionId(): string {
      return Math.random().toString(36).slice(2);
    },
  };
};
