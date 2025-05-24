import { type BaseResponse } from "./light-auth-base";
import { type LightAuthCookie } from "./light-auth-cookie";
import type { LightAuthServerEnv } from "./light-auth-server-env";
import { type LightAuthSession, type LightAuthUser } from "./light-auth-session";

export interface LightAuthRouter {
  redirectTo: (args: { env: LightAuthServerEnv; basePath: string; url: string; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
  getCookies: (args: {
    env: LightAuthServerEnv;
    basePath: string;
    search?: string | RegExp;
    [key: string]: unknown;
  }) => Promise<LightAuthCookie[]> | LightAuthCookie[];
  setCookies: (args: {
    env: LightAuthServerEnv;
    basePath: string;
    cookies?: LightAuthCookie[];
    [key: string]: unknown;
  }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: (args: { env: LightAuthServerEnv; basePath: string; search?: string | RegExp; [key: string]: unknown }) => Headers | Promise<Headers>;
  getUrl: (args: { env: LightAuthServerEnv; basePath: string; endpoint?: string; [key: string]: unknown }) => string | Promise<string>;
  getRequest: (args: { env: LightAuthServerEnv; basePath: string; [key: string]: unknown }) => Promise<Request> | Request;
  returnJson: (args: { env: LightAuthServerEnv; basePath: string; data: {} | null; [key: string]: unknown }) => Promise<BaseResponse> | BaseResponse;
}
