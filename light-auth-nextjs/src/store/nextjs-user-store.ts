import { Cookie, decryptJwt, DEFAULT_SESSION_COOKIE_NAME, encryptJwt, LightAuthSession, LightAuthUser, UserStore } from "@light-auth/core";
import { nextJsCookieStore } from "./nextjs-cookie-store";

/**
 * A concrete SessionStore implementation for Node.js server-side,
 * using the default cookie store to set and get session cookies.
 */

const ALLOWED_COOKIE_SIZE = 4096;
// Based on commented out section above
const ESTIMATED_EMPTY_COOKIE_SIZE = 160;
const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;

export function splitCookieValue(value: string): Map<number, string> {
  const chunkCount = Math.ceil(value.length / CHUNK_SIZE);

  if (chunkCount === 1) {
    return new Map<number, string>([[0, value]]);
  }

  const values = new Map<number, string>();
  for (let i = 0; i < chunkCount; i++) {
    const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    values.set(i, chunk);
  }

  return values;
}

export const nextJsUserCookieStore: UserStore = {
  async getUser(): Promise<LightAuthUser | null> {
    const cookies = await nextJsCookieStore.getCookies({ search: new RegExp(`^${DEFAULT_SESSION_COOKIE_NAME}\\.`) });

    if (!cookies) return null;

    // Filter out cookies that don't start with the default session cookie name
    const filteredCookies = cookies.filter((c) => c.name.startsWith(DEFAULT_SESSION_COOKIE_NAME));

    // Sort cookies by the integer suffix after the last dot in the name
    const sortedCookies = filteredCookies.slice().sort((a, b) => {
      const getIndex = (cookie: Cookie) => {
        const parts = cookie.name.split(".");
        return parseInt(parts[parts.length - 1], 10);
      };
      return getIndex(a) - getIndex(b);
    });

    // Reconstruct the JWT from the sorted cookie values
    const jwt = sortedCookies.map((c) => c.value).join("");
    if (!jwt) return null;

    try {
      var session = await decryptJwt(jwt);
      return session as LightAuthUser;
    } catch {
      return null;
    }
  },

  async setUser({ user }: { user: LightAuthUser }): Promise<void> {
    const jwt = await encryptJwt(user);

    // template for the cookie

    const cookie: Cookie = {
      name: "",
      value: "",
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: user.expires_at,
    };

    // create chunks if needed (ie if the jwt is too long > 4096 bytes)
    const chunks = splitCookieValue(jwt);

    let cookies: Cookie[] = [];

    for (const [key, value] of chunks) {
      if (value === "") continue;

      const chunkCookie: Cookie = {
        ...cookie,
        name: `${DEFAULT_SESSION_COOKIE_NAME}.${key}`,
        value: value,
      };
      cookies.push(chunkCookie);
    }
    await nextJsCookieStore.setCookies({ cookies });
  },

  async deleteUser({ user }: { user: LightAuthUser }): Promise<void> {
    await nextJsCookieStore.deleteCookies({ search: new RegExp(`^${DEFAULT_SESSION_COOKIE_NAME}\\.\\d+$`) });
  },

  generateStoreId(): string {
    return Math.random().toString(36).slice(2);
  },
};
