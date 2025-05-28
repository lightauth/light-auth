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

import { H3Event, type EventHandlerRequest, getCookie, setCookie, deleteCookie, parseCookies } from "h3";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nuxtJsLightAuthSessionStore: LightAuthSessionStore = {
  async getSession<Session extends LightAuthSession = LightAuthSession>({
    env,
    event,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    event?: H3Event<EventHandlerRequest>;
  }): Promise<Session | null> {
    if (!event) throw new Error("Event is required to get the session in nuxtJsLightAuthSessionStore.");

    const requestCookie = getCookie(event, DEFAULT_SESSION_NAME);
    if (!requestCookie) return null;

    try {
      const decryptedSession = await decryptJwt(requestCookie, buildSecret(env));
      return decryptedSession as Session;
    } catch (error) {
      console.error("Failed to decrypt session cookie:", error);
      return null;
    }
  },

  async deleteSession<Session extends LightAuthSession = LightAuthSession>({
    event,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    event?: H3Event<EventHandlerRequest>;
  }): Promise<void> {
    if (!event) throw new Error("Event is required to get the session in nuxtJsLightAuthSessionStore.");
    deleteCookie(event, DEFAULT_SESSION_NAME);
  },

  async setSession<Session extends LightAuthSession = LightAuthSession>({
    env,
    session,
    event,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    event?: H3Event<EventHandlerRequest>;
  }): Promise<void> {
    if (!event) throw new Error("Event is required to set the session in nuxtJsLightAuthSessionStore.");

    const value = await encryptJwt(session, buildSecret(env));

    // Check the size of the cookie value in bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

    // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
    setCookie(event, DEFAULT_SESSION_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: session.expiresAt,
    });
  },
  generateSessionId(): string {
    return Math.random().toString(36).slice(2);
  },
};
