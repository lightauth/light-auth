import { BaseRequest, BaseResponse } from "./models/light-auth-base";
import { LightAuthCookie } from "./models/light-auth-cookie";
import * as cookieParser from "cookie";
export interface LightAuthCookieStore {
  getCookies: ({
    req,
    res,
    search,
  }: {
    req?: BaseRequest;
    res?: BaseResponse;
    search?: string | RegExp;
  }) => LightAuthCookie[] | null | Promise<LightAuthCookie[] | null>;
  setCookies: ({ req, res, cookies }: { req?: BaseRequest; res?: BaseResponse; cookies: LightAuthCookie[] }) => Promise<BaseResponse> | BaseResponse;
  deleteCookies: ({ req, res, search }: { req?: BaseRequest; res?: BaseResponse; search: string | RegExp }) => Promise<BaseResponse> | BaseResponse;
}

export const createLightAuthCookieStore = (): LightAuthCookieStore => {
  return {
    getCookies: async ({ req, res, search }: { req?: Request; res?: Response; search?: string | RegExp }): Promise<LightAuthCookie[] | null> => {
      if (!req) throw new Error("Request is required in getCookies function of cookieStore");

      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader) return null;

      const requestCookies = cookieParser.parse(cookieHeader);
      const cookies: LightAuthCookie[] = [];

      for (const [cookieName, cookieValue] of Object.entries(requestCookies)) {
        if (search == null || (typeof search === "string" && cookieName === search) || (search instanceof RegExp && search.test(cookieName))) {
          cookies.push({
            name: cookieName,
            value: cookieValue || "",
            httpOnly: false,
            secure: false,
            sameSite: "lax",
            path: "/",
            maxAge: undefined,
            domain: undefined,
          });
        }
      }

      return cookies.length ? cookies : null;
    },
    setCookies: async ({ req, res, cookies }: { req?: Request; res?: Response; cookies: LightAuthCookie[] }) => {
      if (!res) throw new Error("Response is required in setCookies of cookieStore");

      const cookiesToSet = cookies.map((cookie) =>
        cookieParser.serialize(cookie.name, cookie.value, {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          path: cookie.path,
          maxAge: cookie.maxAge,
          domain: cookie.domain,
        })
      );
      for (const cookieString of cookiesToSet) {
        res.headers.append("Set-Cookie", cookieString);
      }

      return res;
    },
    deleteCookies: async ({ req, res, search }: { req?: Request; res?: Response; search: string | RegExp }) => {
      if (!res) throw new Error("Response is required in deleteCookies of cookieStore");
      if (!req) throw new Error("Request is required in deleteCookies of cookieStore");

      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader) return null;

      const requestCookies = cookieParser.parse(cookieHeader);
      if (!requestCookies) return res;

      const cookies: LightAuthCookie[] = [];
      // Filter cookies based on the search criteria
      for (const [cookieName, cookieValue] of Object.entries(requestCookies)) {
        if ((typeof search === "string" && cookieName === search) || (search instanceof RegExp && search.test(cookieName))) {
          const serialized = cookieParser.serialize(cookieName, "", {
            httpOnly: true,
            path: "/",
            maxAge: 0,
          });
          res.headers.append("Set-Cookie", serialized);
        }
      }

      return res;
    },
  };
};
