import { buildFullUrl, LightAuthConfig, LightAuthCookie, LightAuthRouter } from "@light-auth/core";
import { headers as nextJsHeaders, cookies as nextJsCookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthRouter: LightAuthRouter = {
  async redirectTo({ config, url }: { config: LightAuthConfig; url: string }): Promise<Response> {
    const headersData = await nextJsHeaders();
    const incomingHeaders = new Headers();
    for (const [key, value] of headersData.entries()) incomingHeaders.append(key, value);

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return redirect(fullUrl.toString());
  },

  async setCookies({ cookies }: { cookies?: LightAuthCookie[] }) {
    const cookieStore = await nextJsCookies();

    if (!cookies || cookies.length === 0) return;
    for (const cookie of cookies) {
      cookieStore.set(cookie.name, cookie.value, {
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge,
      });
    }
  },

  async getCookies({ search }: { search?: string | RegExp }) {
    const cookieStore = await nextJsCookies();
    const cookies: LightAuthCookie[] = [];
    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    for (const requestCookie of cookieStore.getAll()) {
      if (!search || !regex || regex.test(requestCookie.name)) cookies.push({ name: requestCookie.name, value: requestCookie.value });
    }

    return cookies;
  },

  async getUrl({ endpoint, req }: { endpoint?: string; req?: NextRequest }) {
    const url = endpoint ?? req?.url;
    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const isServerSide = typeof window === "undefined";

    if (!isServerSide) return url;

    const headersData = await nextJsHeaders();
    const incomingHeaders = new Headers();
    for (const [key, value] of headersData.entries()) incomingHeaders.append(key, value);

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return fullUrl.toString();
  },

  async getHeaders({ search }: { search?: string | RegExp }): Promise<Headers> {
    const headersStore = await nextJsHeaders();

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of headersStore.entries()) {
      if (!search || !regex || regex.test(key)) filteredHeaders.append(key, value);
    }

    return filteredHeaders;
  },

  returnJson(args: { config: LightAuthConfig; data: {} | null }): NextResponse {
    return NextResponse.json(args.data);
  },
};
