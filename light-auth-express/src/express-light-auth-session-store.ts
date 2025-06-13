import {
  buildSecret,
  decryptJwt,
  DEFAULT_SESSION_NAME,
  encryptJwt,
  type LightAuthConfig,
  type LightAuthServerEnv,
  type LightAuthSession,
  type LightAuthSessionStore,
  type LightAuthUser,
} from "@light-auth/core";
import { type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import * as cookieParser from "cookie";
/**
 * A concrete CookieStore implementation for express,
 */
export const expressLightAuthSessionStore: LightAuthSessionStore = {
  getSession: async function <Session extends LightAuthSession = LightAuthSession>({
    env,
    basePath,
    req,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    req?: ExpressRequest;
  }): Promise<Session | null> {
    if (!req) throw new Error("Request is required in getSession function of expressLightAuthSessionStore");

    const incomingCookies = req.headers?.cookie;
    if (!incomingCookies) return null;

    // parse the cookies
    const parsedCookies = cookieParser.parse(incomingCookies);

    const sessionString = parsedCookies[DEFAULT_SESSION_NAME];
    if (!sessionString) return null;
    try {
      const decryptedSession = await decryptJwt(sessionString, buildSecret(env));
      return decryptedSession as Session;
    } catch (error) {
      console.error("Failed to decrypt session cookie:", error);
      return null;
    }
  },

  setSession: async function <Session extends LightAuthSession = LightAuthSession>({
    env,
    basePath,
    res,
    session,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    res?: ExpressResponse;
    session: Session;
  }): Promise<Session> {
    if (!res) throw new Error("Response is required in setSession of expressLightAuthSessionStore");

    const value = await encryptJwt(session, buildSecret(env));

    // Check the size of the cookie value in bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

    // get the cookie expiration time
    res.cookie(DEFAULT_SESSION_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expiresAt),
    });

    return session;
  },
  deleteSession: function <Session extends LightAuthSession = LightAuthSession>({
    res,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    res?: ExpressResponse;
  }): void {
    if (!res) throw new Error("Response is required in deleteSession of expressLightAuthSessionStore");

    res.clearCookie(DEFAULT_SESSION_NAME);
  },
  generateSessionId: function (): string {
    return Math.random().toString(36).substring(2, 15);
  },
};
