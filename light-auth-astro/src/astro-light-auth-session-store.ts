import {
  buildSecret,
  decryptJwt,
  DEFAULT_SESSION_NAME,
  encryptJwt,
  getSessionExpirationMaxAge,
  type LightAuthServerEnv,
  type LightAuthSession,
  type LightAuthSessionStore,
} from "@light-auth/core";
import type { AstroSharedContext } from "astro";
import * as cookieParser from "cookie";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const astroLightAuthSessionStore: LightAuthSessionStore = {
  async getSession<Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    context?: AstroSharedContext;
    req?: Request;
  }): Promise<Session | null> {
    const { env, basePath, context, req } = args;
    if (!env) throw new Error("light-auth: Env is required in getSession of astroLightAuthSessionStore");

    const request = context?.request || req;
    if (!request) throw new Error("light-auth: Request is required in getSession of astroLightAuthSessionStore");

    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const requestCookies = cookieParser.parse(cookieHeader);
    const sessionCookie = requestCookies[DEFAULT_SESSION_NAME];
    if (!sessionCookie) return null;

    try {
      const decryptedSession = await decryptJwt(sessionCookie, buildSecret(env));
      return decryptedSession as Session;
    } catch (error) {
      console.error("Failed to decrypt session cookie:", error);
      return null;
    }
  },

  async deleteSession<Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    session: Session;
    context?: AstroSharedContext;
  }): Promise<void> {
    const { env, context } = args;
    if (!env) throw new Error("light-auth: Env is required in deleteSession of astroLightAuthSessionStore");
    if (!context) throw new Error("light-auth: Context is required in deleteSession of astroLightAuthSessionStore");

    context.cookies.set(DEFAULT_SESSION_NAME, "", {
      maxAge: 0,
      path: "/",
    });
  },

  async setSession<Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    session: Session;
    context?: AstroSharedContext;
  }): Promise<Session> {
    const { env, session, context } = args;
    if (!context) throw new Error("light-auth: Context is required in setSession of astroLightAuthSessionStore");

    const value = await encryptJwt(session, buildSecret(env));

    // Check the size of the cookie value in bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);

    if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

    // get the cookie expiration time
    const maxAge = getSessionExpirationMaxAge(); // 30 days if no env var is set

    // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
    context.cookies.set(DEFAULT_SESSION_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: maxAge,
    });
    return session;
  },
  generateSessionId(): string {
    return Math.random().toString(36).slice(2);
  },
};
