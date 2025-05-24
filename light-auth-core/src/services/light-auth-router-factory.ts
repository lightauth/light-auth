import { type LightAuthConfig, type LightAuthCookie, type LightAuthServerEnv, type LightAuthSession, type LightAuthUser } from "../models";
import { type LightAuthRouter } from "../models/light-auth-router";
import { buildFullUrl } from "./utils";
import * as cookieParser from "cookie";

export const createLightAuthRouter = (): LightAuthRouter => {
  return {
    redirectTo({ url }: { url: string }) {
      const res = new Response("Redirecting...", {
        status: 302,
        headers: {
          Location: url,
        },
      });
      return res;
    },

    getCookies({ req, search }: { req?: Request; search?: string | RegExp }): LightAuthCookie[] {
      const cookies = req?.headers.get("cookie");
      if (!cookies) return [];

      const requestCookies = cookieParser.parse(cookies);
      const result: LightAuthCookie[] = [];

      const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

      for (const [key, value] of Object.entries(requestCookies)) {
        if (!search || !searchRegex || searchRegex.test(key)) result.push({ name: key.trim(), value: value || "" });
      }
      return result;
    },

    setCookies({ res, cookies }: { res?: Response; cookies?: LightAuthCookie[] }) {
      if (!res) throw new Error("light-auth: Response object is required to set cookies.");

      if (!cookies || cookies.length === 0) {
        return res;
      }

      for (const cookie of cookies) {
        const stateCookie = cookieParser.serialize(cookie.name, cookie.value, {
          path: cookie.path,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          maxAge: cookie.maxAge,
        });
        res.headers.set("Set-Cookie", stateCookie);
      }
      return res;
    },
    returnJson({ res, data }: { res?: Response; data: any }) {
      if (!res) throw new Error("light-auth: Response object is required to write JSON.");
      const json = JSON.stringify(data);
      const response = new Response(json, {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(json).toString(),
        },
      });
      return response;
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
