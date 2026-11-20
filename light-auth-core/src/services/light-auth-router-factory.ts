import { type LightAuthCookie, type LightAuthServerEnv } from "../models";
import { type LightAuthRouter } from "../models/light-auth-router";
import { buildFullUrl } from "./utils";
import { parse, serialize } from "./cookieParser";

/** Cookies written on the response given by the caller (session cookie, OAuth flow cookies) are carried by the final response */
function withCookiesOf(res: Response | undefined, headers: Headers): Headers {
  for (const cookie of res?.headers.getSetCookie() ?? []) headers.append("Set-Cookie", cookie);
  return headers;
}

/**
 * Router for fetch based frameworks (Request / Response).
 * Call the light auth handler with { req, res }, res being a Response that collects the cookies: they are copied to the returned response.
 */
export const createLightAuthRouter = (): LightAuthRouter => {
  return {
    redirectTo({ url, init, res }: { url: string; init?: ResponseInit | undefined; res?: Response }) {
      const headers = withCookiesOf(res, new Headers(init?.headers));
      headers.set("Location", url);

      return new Response(null, { ...(init ?? {}), status: init?.status ?? 302, headers });
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

    setCookies({ res, cookies }: { res?: Response; cookies?: LightAuthCookie[] }) {
      const response = res ?? new Response(null);

      for (const cookie of cookies ?? []) {
        const serializedCookie = serialize(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          maxAge: cookie.maxAge,
        });
        response.headers.append("Set-Cookie", serializedCookie);
      }
      return response;
    },

    returnJson({ res, data, init }: { res?: Response; data: any; init?: ResponseInit | undefined }) {
      // null is serialized as well: clients always parse the body as JSON
      const json = JSON.stringify(data ?? null);
      const headers = withCookiesOf(res, new Headers(init?.headers));

      if (!headers.has("content-type")) headers.set("content-type", "application/json");

      return new Response(json, {
        ...(init ?? {}),
        status: init?.status ?? 200,
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

      if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of createLightAuthRouter.");

      if (url.startsWith("http") || !req) return url;

      const fullUrl = buildFullUrl({ url, incomingHeaders: req.headers });
      return fullUrl.toString();
    },
    getRequest({ req }: { env: LightAuthServerEnv; basePath: string; req?: Request }) {
      if (!req) throw new Error("light-auth: No request object provided in getRequest of createLightAuthRouter.");
      return req;
    },
  };
};
