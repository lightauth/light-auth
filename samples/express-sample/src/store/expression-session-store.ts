/**
 * A concrete SessionStore implementation for Node.js server-side,
 * using the default cookie store to set and get session cookies.
 */

import { Cookie, decryptJwt, DEFAULT_SESSION_COOKIE_NAME, encryptJwt, LightAuthSession, SessionStore, splitCookieValue } from "@light-auth/core";
import { expressNavigatoreStore } from "./express-navigatore-store";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";

export const expressSessionStore: SessionStore = {
  async getSession({ req, res }: { req?: ExpressRequest; res?: ExpressResponse }): Promise<LightAuthSession | null> {
    const cookies = await expressNavigatoreStore.getCookies({ req, res, search: new RegExp(`^${DEFAULT_SESSION_COOKIE_NAME}\\.`) });
    if (!cookies || cookies.length === 0) return null;

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
      return session as LightAuthSession;
    } catch {
      return null;
    }
  },

  async setSession({ req, res, session }: { req?: ExpressRequest; res?: ExpressResponse; session: LightAuthSession }): Promise<void> {
    const jwt = await encryptJwt(session);

    // template for the cookie

    const cookie: Cookie = {
      name: "",
      value: "",
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: session.expires_at,
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
    await expressNavigatoreStore.setCookies({ req, res, cookies });
  },

  async deleteSession({ req, res }: { req?: ExpressRequest; res?: ExpressResponse }): Promise<void> {
    await expressNavigatoreStore.deleteCookies({ req, res, cookiesNames: [DEFAULT_SESSION_COOKIE_NAME] });
  },

  generateSessionId(): string {
    return Math.random().toString(36).slice(2);
  },
};
