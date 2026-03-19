import {
  buildSecret,
  decryptJwt,
  DEFAULT_SESSION_NAME,
  encryptJwt,
  type LightAuthServerEnv,
  type LightAuthSession,
  type LightAuthSessionStore,
  type LightAuthUser,
} from "@light-auth/core";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthSessionStore: LightAuthSessionStore = {
  async getSession<Session extends LightAuthSession = LightAuthSession>({ env, sessionName }: { env: LightAuthServerEnv; basePath: string; sessionName?: string }): Promise<Session | null> {
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();
    const requestCookie = cookieStore.get(sessionName ?? DEFAULT_SESSION_NAME);

    if (!requestCookie) return null;

    try {
      const decryptedSession = await decryptJwt(requestCookie.value, buildSecret(env));
      return decryptedSession as Session;
    } catch (error) {
      console.error("Failed to decrypt session cookie:", error);
      return null;
    }
  },

  async deleteSession<Session extends LightAuthSession = LightAuthSession>({
    sessionName,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    sessionName?: string;
  }): Promise<void> {
    const { cookies } = await import("next/headers");

    const cookieStore = await cookies();
    cookieStore.delete(sessionName ?? DEFAULT_SESSION_NAME);
  },

  async setSession<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
    env,
    session,
    sessionName,
  }: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    sessionName?: string;
  }): Promise<Session> {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();

    const value = await encryptJwt(session, buildSecret(env));

    // Check the size of the cookie value in bytes
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    if (valueBytes.length > 4096) throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");

    // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
    cookieStore.set(sessionName ?? DEFAULT_SESSION_NAME, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      expires: new Date(session.expiresAt),
    });
    return session;
  },
  generateSessionId(): string {
    return Math.random().toString(36).slice(2);
  },
};
