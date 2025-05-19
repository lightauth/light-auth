import { buildFullUrl, LightAuthConfig, LightAuthCookie, LightAuthRouter, LightAuthSession, LightAuthUser } from "@light-auth/core";
import { NextRequest, NextResponse } from "next/server";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthRouter: LightAuthRouter = {
  async redirectTo({ url }: { url: string }): Promise<Response> {
    const { headers: nextJsHeaders } = await import("next/headers");
    const { redirect } = await import("next/navigation");

    const headersData = await nextJsHeaders();
    const incomingHeaders = new Headers();
    for (const [key, value] of headersData.entries()) incomingHeaders.append(key, value);

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return redirect(fullUrl.toString());
  },

  async setCookies({ cookies }: { cookies?: LightAuthCookie[] }) {
    const { cookies: nextJsCookies } = await import("next/headers");

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
    const { cookies: nextJsCookies } = await import("next/headers");
    const cookieStore = await nextJsCookies();
    const cookies: LightAuthCookie[] = [];
    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    for (const requestCookie of cookieStore.getAll()) {
      if (!search || !regex || regex.test(requestCookie.name)) cookies.push({ name: requestCookie.name, value: requestCookie.value });
    }

    return cookies;
  },

  getRequest<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
    config,
    req,
  }: {
    config: LightAuthConfig<Session, User>;
    req?: Request;
  }) {
    if (!req) throw new Error("light-auth: No request object provided in getRequest of nextJsLightAuthRouter.");
    return req;
  },

  async getUrl({ endpoint, req }: { endpoint?: string; req?: NextRequest }) {
    const url = endpoint ?? req?.url;
    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const isServerSide = typeof window === "undefined";

    if (!isServerSide) return url;
    const { headers: nextJsHeaders } = await import("next/headers");

    const headersData = await nextJsHeaders();
    const incomingHeaders = new Headers();
    for (const [key, value] of headersData.entries()) incomingHeaders.append(key, value);

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return fullUrl.toString();
  },

  async getHeaders({ search }: { search?: string | RegExp }): Promise<Headers> {
    const isServerSide = typeof window === "undefined";

    if (!isServerSide) return new Headers();

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();
    const { headers: nextJsHeaders } = await import("next/headers");

    const headersStore = await nextJsHeaders();
    // Iterate and filter headers whose names match the regex
    for (const [key, value] of headersStore.entries()) {
      if (!search || !regex || regex.test(key)) filteredHeaders.append(key, value);
    }

    return filteredHeaders;
  },

  async returnJson<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    data: {} | null;
    config: LightAuthConfig<Session, User>;
  }): Promise<NextResponse> {
    return NextResponse.json(args.data);
  },
};
