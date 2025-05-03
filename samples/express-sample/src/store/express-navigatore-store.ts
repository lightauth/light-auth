import { Cookie, NavigatorStore } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import * as cookieParser from "cookie";

export const expressNavigatorStore: NavigatorStore = {
  getUrl: function ({ req, res }: { req?: ExpressRequest; res?: ExpressResponse }): URL {
    if (!req) throw new Error("Request is required in getUrl function of expressNavigatoreStore");

    const url = req?.protocol + "://" + req?.get("host") + req.originalUrl;
    const parsedUrl = new URL(url);
    const searchParams = new URLSearchParams(req?.query as any);
    parsedUrl.search = searchParams.toString();
    return parsedUrl;
  },

  getHeaders: function ({ req, res }: { req?: ExpressRequest; res?: ExpressResponse }): Headers {
    if (!req) throw new Error("Request is required in getHeaders function of expressNavigatoreStore");

    const incomingHeadrs = req.headers;

    const headers = new Headers();
    if (incomingHeadrs) {
      for (const [key, value] of Object.entries(incomingHeadrs)) {
        if (value) {
          headers.set(key, value.toString());
        }
      }
    }
    return headers;
  },
  setHeaders: function ({
    req,
    res,
    headers,
  }: {
    req?: ExpressRequest;
    res?: ExpressResponse;
    headers: Map<string, string> | { [key: string]: string };
  }): ExpressResponse {
    if (!res) throw new Error("Response is required in setHeaders of expressNavigatoreStore");

    for (const [key, value] of headers instanceof Map ? headers : Object.entries(headers)) {
      if (res.headersSent) {
        res.setHeader(key, value);
      } else {
        res.append(key, value);
      }
    }
    return res;
  },
  redirectTo: function ({ req, res, url }: { req?: ExpressRequest; res?: ExpressResponse; url: string }): ExpressResponse {
    if (!res) throw new Error("Response is required in redirectTo of expressNavigatoreStore");

    res.redirect(302, url);
    return res;
  },
  getCookies: function ({
    req,
    res,
    search,
  }: {
    req?: ExpressRequest;
    res?: ExpressResponse;
    search: string | RegExp;
  }): Cookie[] | null | Promise<Cookie[] | null> {
    if (!req) throw new Error("Request is required in getCookies function of expressNavigatoreStore");

    const reqCookies = req?.headers?.cookie;

    if (!reqCookies) return null;
    const parsedCookies = cookieParser.parse(reqCookies);

    const cookies = Object.entries(parsedCookies)
      .filter(([name]) => (typeof search === "string" ? name === search : search instanceof RegExp ? search.test(name) : false))
      .map(([name, value]) => {
        const cookie: Cookie = {
          name,
          value: value || "",
          httpOnly: false,
          secure: false,
          sameSite: "lax",
        };
        return cookie;
      });

    return cookies;
  },

  setCookies: function ({ req, res, cookies }: { req?: ExpressRequest; res?: ExpressResponse; cookies: Cookie[] }): ExpressResponse {
    if (!res) throw new Error("Response is required in setCookie of expressNavigatoreStore");

    // res.cookie("rememberme", "1", { expires: new Date(Date.now() + 900000), httpOnly: true });
    res.cookie("rememberme", "2", { maxAge: 900000, httpOnly: true });

    // maxAge:  Specifies the number (in milliseconds) to be the value for the `Max-Age`
    // since cookie maxAge from light-auth-core is in seconds, we need to multiply by 1000

    for (const cookie of cookies) {
      res.cookie(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        path: cookie.path,
        maxAge: cookie.maxAge ? cookie.maxAge * 1000 : 1000,
        domain: cookie.domain,
      });
    }

    return res;
  },
  deleteCookies: function ({ req, res, cookiesNames }: { req?: ExpressRequest; res?: ExpressResponse; cookiesNames: string[] }): ExpressResponse {
    if (!res) throw new Error("Response is required in deleteCookies of expressNavigatoreStore");

    cookiesNames.forEach((name) => {
      res.clearCookie(name);
    });
    return res;
  },
};
