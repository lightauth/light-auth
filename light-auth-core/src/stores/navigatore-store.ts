import { BaseRequest, BaseResponse } from "../models/base";
import { Cookie } from "../models/cookie";

export interface NavigatoreStore {
  // init: ({ req, res }: { req?: Request; res?: Response }) => Promise<unknown> | unknown;

  redirectTo: ({ req, res, url }: { req?: BaseRequest; res?: BaseResponse; url: string }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: ({ req, res, search }: { req?: BaseRequest; res?: BaseResponse; search: string | RegExp }) => Headers | Promise<Headers>;
  setHeaders: ({ req, res, headers }: { req?: BaseRequest; res?: BaseResponse; headers: Map<string, string> }) => Promise<BaseResponse> | BaseResponse;
  getUrl: ({ req, res }: { req?: BaseRequest; res?: BaseResponse }) => URL | Promise<URL>;
  getCookies: ({ req, res, search }: { req?: BaseRequest; res?: BaseResponse; search: string | RegExp }) => Cookie[] | null | Promise<Cookie[] | null>;
  setCookies: ({ req, res, cookies }: { req?: BaseRequest; res?: BaseResponse; cookies: Cookie[] }) => Promise<BaseResponse> | BaseResponse;
  deleteCookies: ({ req, res, cookiesNames }: { req?: BaseRequest; res?: BaseResponse; cookiesNames: string[] }) => Promise<BaseResponse> | BaseResponse;
}
