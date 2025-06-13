import { parse, serialize } from "./cookieParser";

import { type LightAuthServerEnv, type LightAuthSession, type LightAuthSessionStore, type LightAuthUser } from "../models";
import { DEFAULT_SESSION_NAME } from "../constants";
import { buildSecret, getSessionExpirationMaxAge } from "./utils";
import { decryptJwt, encryptJwt } from "./jwt";

export const createLightAuthSessionStore = (): LightAuthSessionStore => {
  return {
    getSession: async <Session extends LightAuthSession = LightAuthSession>({
      env,
      req,
    }: {
      env: LightAuthServerEnv;
      req?: Request;
    }): Promise<Session | null> => {
      if (!req) throw new Error("light-auth: Request is required in getSession function of light-auth session store");

      const cookieHeader = req.headers.get("Cookie");
      if (!cookieHeader) return null;

      const requestCookies = parse(cookieHeader);
      if (!requestCookies) return null;

      const session = requestCookies[DEFAULT_SESSION_NAME];
      if (!session) return null;

      try {
        const decryptedSession = await decryptJwt(session, buildSecret(env));
        return decryptedSession as Session;
      } catch (error) {
        console.error("Failed to decrypt session:", error);
        return null;
      }
    },
    setSession: async <Session extends LightAuthSession = LightAuthSession>({
      env,
      session,
      res,
    }: {
      env: LightAuthServerEnv;
      session: Session;
      res?: Response;
    }) => {
      if (!res) throw new Error("light-auth: Response is required in setSession of light-auth session store");

      const value = await encryptJwt(session, buildSecret(env));

      // Check the size of the cookie value in bytes
      const encoder = new TextEncoder();
      const valueBytes = encoder.encode(value);

      if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

      // get the cookie expiration time
      const maxAge = getSessionExpirationMaxAge();

      const cookieString = serialize(DEFAULT_SESSION_NAME, value, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: maxAge,
      });

      res.headers.append("Set-Cookie", cookieString);

      return session;
    },
    deleteSession: async <Session extends LightAuthSession = LightAuthSession>({
      res,
    }: {
      env: LightAuthServerEnv;
      session: Session;
      basePath: string;
      res?: Response;
    }) => {
      if (!res) throw new Error("light-auth: Response is required in deleteSessions of light-auth session store");

      const serialized = serialize(DEFAULT_SESSION_NAME, "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
      });
      res.headers.append("Set-Cookie", serialized);
    },
    generateSessionId(): string {
      return Math.random().toString(36).slice(2);
    },
  };
};
