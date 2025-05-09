import { LightAuthCookie, LightAuthCookieStore } from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import * as cookieParser from "cookie";
/**
 * A concrete CookieStore implementation for express,
 */
export const expressLightAuthCookieStore: LightAuthCookieStore = {
  getCookies: function ({ req, search }: { req?: ExpressRequest; search?: string | RegExp }): LightAuthCookie[] | null | Promise<LightAuthCookie[] | null> {
    if (!req) throw new Error("Request is required in getCookies function of expressLightAuthCookieStore");

    const reqCookies = req?.headers?.cookie;

    if (!reqCookies) return null;
    const parsedCookies = cookieParser.parse(reqCookies);

    const cookies = Object.entries(parsedCookies)
      .filter(([name]) => (typeof search === "string" ? name === search : search instanceof RegExp ? search.test(name) : false))
      .map(([name, value]) => {
        const cookie: LightAuthCookie = {
          name,
          value: value || "",
        };
        return cookie;
      });

    return cookies;
  },

  setCookies: function ({ req, res, cookies }: { req?: ExpressRequest; res?: ExpressResponse; cookies: LightAuthCookie[] }): ExpressResponse {
    if (!res) throw new Error("Response is required in setCookie of expressLightAuthCookieStore");

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
  deleteCookies: function ({ req, res, search }: { req?: ExpressRequest; res?: ExpressResponse; search: string | RegExp }): ExpressResponse {
    if (!res) throw new Error("Response is required in deleteCookies of expressLightAuthCookieStore");

    const cookiesNames = Object.keys(req?.headers?.cookie ? cookieParser.parse(req.headers.cookie) : {});
    cookiesNames.forEach((name) => {
      if (typeof search === "string" ? name === search : search instanceof RegExp ? search.test(name) : false) {
        res.clearCookie(name);
      }
    });
    return res;
  },
};
