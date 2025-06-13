import type { LightAuthServerEnv } from "./light-auth-server-env";
import { type LightAuthSession, type LightAuthUser } from "./light-auth-session";

export interface LightAuthUserAdapter {
  getUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    userId: string | number;
    [key: string]: unknown;
  }) => User | null | Promise<User | null>;
  setUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    user: User;
    [key: string]: unknown;
  }) => User | Promise<User>;
  deleteUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    env: LightAuthServerEnv;
    basePath: string;
    user: User;
    [key: string]: unknown;
  }) => Promise<void>;
}
