import { BaseResponse } from "./light-auth-base";
import { LightAuthCookie } from "./light-auth-cookie";

export interface LightAuthCookieStore {
  getCookies: (args: { search?: string | RegExp; [key: string]: unknown }) => LightAuthCookie[] | null | Promise<LightAuthCookie[] | null>;
  setCookies: (args: { cookies: LightAuthCookie[]; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  deleteCookies: (args: { search?: string | RegExp; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  generateStoreId: () => string;
}
