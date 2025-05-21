import { type BaseResponse } from "./light-auth-base";
import { type LightAuthConfig } from "./light-auth-config";

import { type LightAuthSession, type LightAuthUser } from "./light-auth-session";

export interface LightAuthSessionStore {
  getSession: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    [key: string]: unknown;
  }) => Session | null | Promise<Session | null>;
  setSession: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    session: Session;
    [key: string]: unknown;
  }) => Promise<BaseResponse> | BaseResponse;
  deleteSession: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    [key: string]: unknown;
  }) => Promise<BaseResponse> | BaseResponse;
  generateSessionId: () => string;
}
