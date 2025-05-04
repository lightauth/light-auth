import { LightAuthCookie, LightAuthCookieStore } from "@light-auth/core";
import { cookies as nextCookies } from "next/headers";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthCookieStore: LightAuthCookieStore = {
  async getCookies({ search }: { search?: string | RegExp }): Promise<LightAuthCookie[] | null> {
    const cookieStore = await nextCookies();
    const requestCookies = cookieStore.getAll();

    if (!requestCookies) return null;

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Filter cookies whose names match the regex
    const filteredCookies = regex instanceof RegExp ? requestCookies.filter((c) => regex.test(c.name)) : requestCookies;

    return filteredCookies as LightAuthCookie[];
  },

  async deleteCookies({ search }: { search: string | RegExp }): Promise<void> {
    const cookieStore = await nextCookies();
    const regex = typeof search === "string" ? new RegExp(search) : search;
    const cookiesNames = cookieStore
      .getAll()
      .filter((c) => regex.test(c.name))
      .map((c) => c.name);
    cookiesNames.forEach((name) => {
      cookieStore.delete(name);
    });
  },

  async setCookies({ cookies }: { cookies: LightAuthCookie[] }): Promise<void> {
    const cookieStore = await nextCookies();

    for (const cookie of cookies) {
      // Check the size of the cookie value in bytes
      const encoder = new TextEncoder();
      const valueBytes = encoder.encode(cookie.value);

      if (valueBytes.length > 4096) {
        throw new Error("Cookie value exceeds 4096 bytes, which may not be supported by your browser.");
      }

      // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
      cookieStore.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        path: cookie.path,
        maxAge: cookie.maxAge,
        domain: cookie.domain,
      });
    }
  },
};
