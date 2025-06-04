import { type LightAuthConfig, type LightAuthCookie, type LightAuthServerEnv, type LightAuthSession, type LightAuthUser } from "../models";
import { type LightAuthRouter } from "../models/light-auth-router";
import { buildFullUrl } from "./utils";
import { parse, serialize } from "./cookieParser";

export const createLightAuthRouter = (): LightAuthRouter => {
  return {
    redirectTo({ url, init }: { url: string; init?: ResponseInit | undefined }) {
      const status = init?.status ?? 302;
      const headers = new Headers(init?.headers);

      const response = new Response("Redirecting...", {
        ...(init ?? {}),
        status,
        headers,
      });

      if (!headers.has("location")) {
        headers.set("Location", url);
      }

      return response;
    },

    getCookies({ req, search }: { req?: Request; search?: string | RegExp }): LightAuthCookie[] {
      const cookies = req?.headers.get("cookie");
      if (!cookies) return [];

      const requestCookies = parse(cookies);
      const result: LightAuthCookie[] = [];

      const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

      for (const [key, value] of Object.entries(requestCookies)) {
        if (!search || !searchRegex || searchRegex.test(key)) result.push({ name: key.trim(), value: value || "" });
      }
      return result;
    },

    setCookies({ res, cookies, init }: { res?: Response; cookies?: LightAuthCookie[]; init?: ResponseInit | undefined }) {
      const status = init?.status ?? 200;
      const headers = new Headers(init?.headers);

      const response = new Response(null, {
        ...(init ?? {}),
        status,
        headers,
      });

      if (!cookies || cookies.length === 0) {
        return response;
      }

      for (const cookie of cookies) {
        const stateCookie = serialize(cookie.name, cookie.value, {
          path: cookie.path,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          maxAge: cookie.maxAge,
        });
        response.headers.set("Set-Cookie", stateCookie);
      }
      return res;
    },

    returnJson({ res, data, init }: { res?: Response; data: any; init?: ResponseInit | undefined }) {
      const json = data ? JSON.stringify(data) : undefined;
      const status = init?.status ?? 200;
      const headers = new Headers(init?.headers);

      if (!headers.has("content-length")) {
        const encoder = new TextEncoder();
        headers.set("content-length", encoder.encode(json).byteLength.toString());
      }

      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json");
      }

      return new Response(json, {
        ...(init ?? {}),
        status,
        headers,
      });
    },

    getHeaders({ req, search }: { req?: Request; search?: string | RegExp }): Headers {
      const headers = req?.headers;
      if (!headers) return new Headers();

      const result = new Headers();
      const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

      for (const [key, value] of headers.entries()) {
        if (!search || !searchRegex) result.set(key, value);
        else if (searchRegex.test(key)) result.set(key, value);
      }
      return result;
    },

    getUrl({ endpoint, req }: { endpoint?: string; req?: Request }) {
      const url = endpoint ?? req?.url;

      if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");

      if (url.startsWith("http") || !req) return url;

      const fullUrl = buildFullUrl({ url, incomingHeaders: req.headers });
      return fullUrl.toString();
    },
    getRequest({ req }: { env: LightAuthServerEnv; basePath: string; req?: Request }) {
      if (!req) throw new Error("light-auth: No request object provided in getRequest of nextJsLightAuthRouter.");
      return req;
    },
  };
};
