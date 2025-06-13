import {
  buildSecret,
  decryptJwt,
  DEFAULT_SESSION_NAME,
  encryptJwt,
  getSessionExpirationMaxAge,
  type LightAuthConfig,
  type LightAuthServerEnv,
  type LightAuthSession,
  type LightAuthSessionStore,
  type LightAuthUser,
} from "@light-auth/core";
import { type RequestEvent } from "@sveltejs/kit";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const sveltekitLightAuthSessionStore: LightAuthSessionStore = {
  async getSession<Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    event?: RequestEvent;
  }): Promise<Session | null> {
    const { env, basePath, event } = args;

    if (!env) throw new Error("light-auth: Env is required in getSession of sveltekitLightAuthSessionStore");
    if (!event) throw new Error("light-auth: Request is required in getSession of sveltekitLightAuthSessionStore");

    const sessionCookie = event.cookies.get(DEFAULT_SESSION_NAME);
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
    basePath: string;
    session: Session;
    event?: RequestEvent;
  }): Promise<void> {
    const { event } = args;
    if (!event) throw new Error("light-auth: Request is required in deleteSession of sveltekitLightAuthSessionStore");

    event.cookies.set(DEFAULT_SESSION_NAME, "", {
      maxAge: 0,
      path: "/",
    });
  },

  async setSession<Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    event?: RequestEvent;
  }): Promise<Session> {
    const { env, basePath, session, event } = args;
    if (!env) throw new Error("light-auth: Env is required in setSession of sveltekitLightAuthSessionStore");
    if (!event) throw new Error("light-auth: Request is required in setSession of sveltekitLightAuthSessionStore");

    const value = await encryptJwt(session, buildSecret(env));

    // Check the size of the cookie value in bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);

    if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

    // get the cookie expiration time
    const maxAge = getSessionExpirationMaxAge(); // 30 days if no env var is set

    // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
    event.cookies.set(DEFAULT_SESSION_NAME, value, {
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
