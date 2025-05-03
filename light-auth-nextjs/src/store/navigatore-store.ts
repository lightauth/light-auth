import { Cookie, DEFAULT_SESSION_COOKIE_NAME, NavigatoreStore } from "@light-auth/core";
import { cookies as nextCookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsNavigatoreStore: NavigatoreStore = {
  async redirectTo({ req, res, url }: { req?: NextRequest; res?: NextResponse; url: string }) {
    redirect(url);
  },
  async getUrl({ req, res }: { req?: NextRequest; res?: NextResponse }) {
    if (!req) {
      throw new Error("Request is required in defaultNavigatorStore");
    }
    const url = new URL(req.url);
    return url;
  },

  async getCookies({ req, res, search }: { req?: NextRequest; res?: NextResponse; search: string | RegExp }): Promise<Cookie[] | null> {
    const cookieStore = await nextCookies();
    const requestCookies = cookieStore.getAll();
    if (!requestCookies) return null;

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Filter cookies whose names match the regex
    const filteredCookies = requestCookies.filter((c) => regex.test(c.name));

    return filteredCookies as Cookie[];
  },

  async deleteCookies({ req, res, cookiesNames }: { req?: NextRequest; res?: NextResponse; cookiesNames: string[] }): Promise<void> {
    const cookieStore = await nextCookies();
    cookiesNames.forEach((name) => {
      cookieStore.delete(name);
    });
  },

  async setCookies({ req, res, cookies }: { req?: NextRequest; res?: NextResponse; cookies: Cookie[] }): Promise<void> {
    const cookieStore = await nextCookies();

    for (const cookie of cookies) {
      // Check the size of the cookie value in bytes
      const encoder = new TextEncoder();
      const valueBytes = encoder.encode(cookie.value);
      console.log("Cookie value bytes:", valueBytes.length);

      if (valueBytes.length > 4096) {
        throw new Error("Cookie value exceeds 4096 bytes, which may not be supported by browsers.");
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

  async getHeaders({ req, search }: { req?: Request; search: string | RegExp }): Promise<Headers> {
    const headersStore = await headers();

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of headersStore.entries()) {
      if (regex.test(key)) {
        filteredHeaders.append(key, value);
      }
    }

    return filteredHeaders;
  },
  async setHeaders({ req, res, headers }: { req?: NextRequest; res?: NextResponse; headers: Map<string, string> | { [key: string]: string } }): Promise<void> {
    console.warn("setHeaders can't be done in nextjs.");
    return;
  },
};
