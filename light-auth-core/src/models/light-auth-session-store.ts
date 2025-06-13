import { type BaseResponse } from "./light-auth-base";
import type { LightAuthServerEnv } from "./light-auth-server-env";

import { type LightAuthSession, type LightAuthUser } from "./light-auth-session";

export interface LightAuthSessionStore {
  getSession: <Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    [key: string]: unknown;
  }) => Session | null | Promise<Session | null>;
  setSession: <Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    [key: string]: unknown;
  }) => Promise<Session> | Session;
  deleteSession: <Session extends LightAuthSession = LightAuthSession>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    session: Session;
    [key: string]: unknown;
  }) => Promise<void> | void;
  generateSessionId: () => string;
}
