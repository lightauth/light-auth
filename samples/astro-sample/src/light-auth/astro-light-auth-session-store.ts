import {
  buildSecret,
  decryptJwt,
  DEFAULT_SESSION_NAME,
  encryptJwt,
  getSessionExpirationMaxAge,
  type LightAuthConfig,
  type LightAuthCookie,
  type LightAuthSession,
  type LightAuthSessionStore,
} from "@light-auth/core";
import type { APIContext } from "astro";
import * as cookieParser from "cookie";

type AstroContext = APIContext<Record<string, any>, Record<string, string | undefined>>;

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const astroLightAuthSessionStore: LightAuthSessionStore = {
  async getSession(args: { config?: LightAuthConfig; context?: AstroContext; req?: Request }): Promise<LightAuthSession | null> {
    const { config, context, req } = args;
    if (!config) throw new Error("light-auth: Config is required in getSession of astroLightAuthSessionStore");

    const request = context?.request || req;
    if (!request) throw new Error("light-auth: Request is required in getSession of astroLightAuthSessionStore");

    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const requestCookies = cookieParser.parse(cookieHeader);
    const sessionCookie = requestCookies[DEFAULT_SESSION_NAME];
    if (!sessionCookie) return null;

    try {
      const decryptedSession = await decryptJwt(sessionCookie, buildSecret(config.env));
      return decryptedSession as LightAuthSession;
    } catch (error) {
      console.error("Failed to decrypt session cookie:", error);
      return null;
    }
  },

  async deleteSession(args: { config?: LightAuthConfig; context?: AstroContext }): Promise<void> {
    const { config, context } = args;
    if (!config) throw new Error("light-auth: Config is required in deleteSession of astroLightAuthSessionStore");
    if (!context) throw new Error("light-auth: Context is required in deleteSession of astroLightAuthSessionStore");

    context.cookies.delete(DEFAULT_SESSION_NAME);
  },

  async setSession(args: { config: LightAuthConfig; session: LightAuthSession; context?: AstroContext }): Promise<void> {
    const { config, session, context } = args;
    if (!context) throw new Error("light-auth: Context is required in setSession of astroLightAuthSessionStore");

    const value = await encryptJwt(session, buildSecret(config.env));

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
  },
  generateSessionId(): string {
    return Math.random().toString(36).slice(2);
  },
};
