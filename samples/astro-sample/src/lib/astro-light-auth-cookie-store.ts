import { type LightAuthCookie, type LightAuthCookieStore } from "@light-auth/core";
import type { APIContext } from "astro";
import * as cookieParser from "cookie";

type AstroContext = APIContext<Record<string, any>, Record<string, string | undefined>>;

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const astroLightAuthCookieStore: LightAuthCookieStore = {
  async getCookies({ context, search }: { context?: AstroContext; search?: string | RegExp }): Promise<LightAuthCookie[] | null> {
    if (!context) return null;

    const cookieHeader = context.request.headers.get("cookie");
    if (!cookieHeader) return null;

    const requestCookies = cookieParser.parse(cookieHeader);
    const cookies: LightAuthCookie[] = [];

    console.log("astroLightAuthCookieStore: getCookies", requestCookies);

    for (const [cookieName, cookieValue] of Object.entries(requestCookies)) {
      if (search == null || (typeof search === "string" && cookieName === search) || (search instanceof RegExp && search.test(cookieName))) {
        cookies.push({
          name: cookieName,
          value: cookieValue || "",
          httpOnly: false,
          secure: false,
          sameSite: "lax",
          path: "/",
          maxAge: undefined,
          domain: undefined,
        });
      }
    }

    return cookies.length ? cookies : null;
  },

  async deleteCookies({ context, search }: { context?: AstroContext; search?: string | RegExp }): Promise<void> {
    if (!context) throw new Error("light-auth: Context is required in deleteCookies of astroLightAuthCookieStore");

    const cookies = context.cookies.headers();
    const requestCookies = Object.keys(cookies).map((name) => ({ name, value: context.cookies.get(name) }));

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Filter cookies whose names match the regex
    const filteredCookies = regex instanceof RegExp ? requestCookies.filter((c) => regex.test(c.name)) : requestCookies;

    if (!filteredCookies.length) return;

    // Delete cookies
    for (const cookie of filteredCookies) {
      context.cookies.delete(cookie.name, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
      });
    }
  },

  async setCookies({ context, cookies }: { context?: AstroContext; cookies: LightAuthCookie[] }): Promise<void> {
    if (!context) throw new Error("light-auth: Context is required in setCookies of astroLightAuthCookieStore");
    if (!cookies) throw new Error("light-auth: Cookies are required in setCookies of astroLightAuthCookieStore");

    for (const cookie of cookies) {
      // Check the size of the cookie value in bytes
      const encoder = new TextEncoder();
      const valueBytes = encoder.encode(cookie.value);

      if (valueBytes.length > 4096) {
        throw new Error("light-auth: Cookie value exceeds 4096 bytes, which may not be supported by your browser.");
      }

      // maxAge:  Specifies the number (in seconds) to be the value for the `Max-Age`
      context.cookies.set(cookie.name, cookie.value, {
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
