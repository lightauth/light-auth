import {
  buildSecret,
  decryptJwt,
  DEFAULT_SESSION_NAME,
  encryptJwt,
  getSessionExpirationMaxAge,
  LightAuthConfig,
  LightAuthSession,
  LightAuthSessionStore,
} from "@light-auth/core";
import { cookies } from "next/headers";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthSessionStore: LightAuthSessionStore = {
  async getSession({ config }: { config: LightAuthConfig }): Promise<LightAuthSession | null> {
    const cookieStore = await cookies();
    const requestCookie = cookieStore.get(DEFAULT_SESSION_NAME);

    if (!requestCookie) return null;

    try {
      const decryptedSession = await decryptJwt(requestCookie.value, buildSecret(config.env));
      return decryptedSession as LightAuthSession;
    } catch (error) {
      console.error("Failed to decrypt session cookie:", error);
      return null;
    }
  },

  async deleteSession({ config }: { config: LightAuthConfig }): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(DEFAULT_SESSION_NAME);
  },

  async setSession({ config, session }: { config: LightAuthConfig; session: LightAuthSession }): Promise<void> {
    const cookieStore = await cookies();

    const value = await encryptJwt(session, buildSecret(config.env));

    // Check the size of the cookie value in bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);

    if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

    // get the cookie expiration time
    const maxAge = getSessionExpirationMaxAge(); // 30 days if no env var is set

    // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
    cookieStore.set(DEFAULT_SESSION_NAME, value, {
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
