import { buildFullUrl, type LightAuthServerEnv, type LightAuthCookie, type LightAuthRouter } from "@light-auth/core";
import type { AstroSharedContext } from "astro";
import * as cookieParser from "cookie";

export const astroLightAuthRouter: LightAuthRouter = {
  returnJson: function ({ data, context, init }: { data: {} | null; context?: AstroSharedContext; init?: ResponseInit | undefined }): Response {
    const json = data ? JSON.stringify(data) : undefined;
    const status = init?.status ?? 200;

    return new Response(json, {
      ...(init ?? {}),
      status,
    });
  },

  getUrl: function ({ endpoint, context, req }: { endpoint?: string; context?: AstroSharedContext; req?: Request }): string {
    const request = context?.request ?? req;

    let url = endpoint;
    if (!url) url = context?.request?.url || req?.url;

    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of astroLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const isServerSide = typeof window === "undefined";
    if (!isServerSide) return url;

    if (!request) return url;

    const parsedUrl = buildFullUrl({ url, incomingHeaders: request.headers });
    return parsedUrl.toString();
  },

  redirectTo: function ({ url, context }: { url: string; context?: AstroSharedContext }): Response {
    if (!context) throw new Error("AstroSharedContext is required in redirectTo function of astroLightAuthRouter");
    return context.redirect(url, 302);
  },

  getHeaders: function ({ search, context, req }: { search?: string | RegExp; context?: AstroSharedContext; req?: Request }): Headers {
    const request = context?.request ?? req;

    if (!request) return new Headers();

    const incomingHeaders = request.headers;

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of incomingHeaders.entries()) {
      if (!search || !regex) filteredHeaders.append(key, value);
      else if (regex.test(key)) {
        filteredHeaders.append(key, value);
      }
    }

    return filteredHeaders;
  },

  setCookies: function ({ cookies, context }: { cookies?: LightAuthCookie[]; context?: AstroSharedContext }): void {
    if (!context) throw new Error("AstroSharedContext is required in setCookies of expressLightAuthRouter");

    for (const cookie of cookies ?? []) {
      context.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge,
        path: cookie.path,
      });
    }
  },

  getCookies: function ({ search, context }: { search?: string | RegExp; context?: AstroSharedContext }): LightAuthCookie[] {
    if (!context) throw new Error("AstroSharedContext is required in getCookies of expressLightAuthRouter");

    const cookies: LightAuthCookie[] = [];
    const regex = typeof search === "string" ? new RegExp(search) : search;

    for (const cookieString of context.cookies.headers()) {
      const cookie = cookieParser.parse(cookieString);
      const name = Object.keys(cookie)[0];
      const value = cookie[name];
      if (!search || !regex || regex.test(name)) cookies.push({ name: name, value: value || "" });
    }

    const cookieString = context.request?.headers?.get("cookie");
    if (cookieString) {
      const cookie = cookieParser.parse(cookieString);
      for (const cookieString of Object.entries(cookie)) {
        const [name, value] = cookieString;
        if (!search || !regex || regex.test(name)) cookies.push({ name: name, value: value || "" });
      }
    }

    return cookies;
  },

  getRequest: function ({ context }: { env: LightAuthServerEnv; basePath: string; context?: AstroSharedContext }): Request {
    if (!context) throw new Error("AstroSharedContext is required in getRequest of expressLightAuthRouter");

    return context.request;
  },
};
