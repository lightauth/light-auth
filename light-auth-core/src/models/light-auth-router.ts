import { BaseResponse } from "./light-auth-base";
import { LightAuthConfig } from "./light-auth-config";
import { LightAuthCookie } from "./light-auth-cookie";

export interface LightAuthRouter {
  redirectTo: (args: { config: LightAuthConfig; url: string; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getCookies: (args: { config: LightAuthConfig; search?: string | RegExp; [key: string]: unknown }) => Promise<LightAuthCookie[]> | LightAuthCookie[];
  setCookies: (args: { config: LightAuthConfig; cookies?: LightAuthCookie[]; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: (args: { config: LightAuthConfig; search?: string | RegExp; [key: string]: unknown }) => Headers | Promise<Headers>;
  getUrl: (args: { config: LightAuthConfig; endpoint?: string; [key: string]: unknown }) => string | Promise<string>;
  returnJson: (args: { config: LightAuthConfig; data: {} | null; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
}
