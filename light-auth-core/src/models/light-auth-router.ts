import { BaseResponse } from "./light-auth-base";
import { LightAuthConfig } from "./light-auth-config";
import { LightAuthCookie } from "./light-auth-cookie";
import { LightAuthSession, LightAuthUser } from "./light-auth-session";

export interface LightAuthRouter {
  redirectTo: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    url: string;
    [key: string]: unknown;
  }) => Promise<BaseResponse> | BaseResponse;
  getCookies: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    search?: string | RegExp;
    [key: string]: unknown;
  }) => Promise<LightAuthCookie[]> | LightAuthCookie[];
  setCookies: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    cookies?: LightAuthCookie[];
    [key: string]: unknown;
  }) => Promise<BaseResponse> | BaseResponse;
  getHeaders: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    search?: string | RegExp;
    [key: string]: unknown;
  }) => Headers | Promise<Headers>;
  getUrl: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    endpoint?: string;
    [key: string]: unknown;
  }) => string | Promise<string>;
  returnJson: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    data: {} | null;
    [key: string]: unknown;
  }) => Promise<BaseResponse> | BaseResponse;
}
