import { buildFullUrl, LightAuthConfig, LightAuthCookie, LightAuthRouter, LightAuthSession, LightAuthUser } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import * as cookieParser from "cookie";

export const expressLightAuthRouter: LightAuthRouter = {
  returnJson: function ({ res, data }: { res?: ExpressResponse; data: {} | null }): ExpressResponse {
    if (!res) throw new Error("Response is required in writeJson function of expressLightAuthRouter");
    res.json(data);
    return res;
  },

  getRequest: async function <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    req?: ExpressRequest;
    [key: string]: unknown;
  }): Promise<Request> {
    const { config, req } = args;
    if (!req) throw new Error("Request is required in getRequest function of expressLightAuthRouter");
    const url = await this.getUrl({ ...args });
    const headers = await this.getHeaders({ ...args });
    return new Request(url, { method: req.method, headers: headers });
  },

  getUrl: function ({ endpoint, req, args }: { endpoint?: string; req?: ExpressRequest; args?: any }): string {
    const url = endpoint ?? req?.url;
    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of expressLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const isServerSide = typeof window === "undefined";
    if (!isServerSide) return url;

    if (!req) throw new Error("Request is required in getUrl function of expressLightAuthRouter");

    const headers = new Headers();
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        if (!value) continue;
        const vals = Array.isArray(value) ? value : [value];
        for (const val of vals) {
          headers.append(key, val);
        }
      }
    }

    const fullUrl = buildFullUrl({ url, incomingHeaders: headers });
    return fullUrl.toString();
  },

  getCookies: function ({ search, req }: { search?: string | RegExp; req?: ExpressRequest }): LightAuthCookie[] {
    if (!req) throw new Error("Request is required in getCookies function of expressLightAuthRouter");

    const incomingCookies = req.headers?.cookie;
    if (!incomingCookies) return [];

    // parse the cookies
    const parsedCookies = cookieParser.parse(incomingCookies);
    const cookieArray = Object.entries(parsedCookies).map<LightAuthCookie>(([name, value]) => ({ name, value: value || "" }));

    if (!incomingCookies) return [];
    const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

    return cookieArray.filter((cookie) => {
      if (!cookie.name || !cookie.value) return false;
      if (!search || !searchRegex) return true;
      return searchRegex.test(cookie.name);
    });
  },

  getHeaders: function ({ search, req }: { search?: string | RegExp; req?: ExpressRequest }): Headers {
    if (!req) throw new Error("Request is required in getHeaders function of expressLightAuthRouter");

    const incomingHeaders = req.headers;
    if (!incomingHeaders) return new Headers();

    const searchRegex = typeof search === "string" ? new RegExp(search, "i") : search;

    const headers = new Headers();
    if (incomingHeaders) {
      for (const [key, value] of Object.entries(incomingHeaders)) {
        if (!value) continue;
        const vals = Array.isArray(value) ? value : [value];
        for (const val of vals) {
          if (!search || !searchRegex) headers.append(key, val);
          else if (searchRegex.test(key)) {
            headers.append(key, val);
          }
        }
      }
    }
    return headers;
  },

  setCookies: function ({ res, cookies }: { res?: ExpressResponse; cookies?: LightAuthCookie[] }): ExpressResponse {
    if (!res) throw new Error("Response is required in setCookies of expressLightAuthRouter");

    if (cookies) {
      for (const cookie of cookies) {
        res.cookie(cookie.name, cookie.value, {
          // unfortunately, express set maxAge in milliseconds (not seconds)
          maxAge: cookie.maxAge ? cookie.maxAge * 1000 : 1000 * 60 * 10,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          path: cookie.path,
        });
      }
    }

    return res;
  },
  redirectTo: function ({ req, res, url }: { req?: ExpressRequest; res?: ExpressResponse; url: string }): ExpressResponse | undefined | void {
    if (!res) throw new Error("Response is required in redirectTo of expressLightAuthRouter");
    if (!req) throw new Error("Request is required in redirectTo of expressLightAuthRouter");

    if (url.startsWith("http")) return res.redirect(url);
    // get headers from the incoming request
    // and build the full url
    const incomingHeaders = new Headers();
    if (req?.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          value.forEach((v) => incomingHeaders.append(key, v));
        } else {
          incomingHeaders.append(key, value);
        }
      }
    }
    const fullUrl = buildFullUrl({ url, incomingHeaders });
    res.redirect(fullUrl.toString());
  },
};
