import { type LightAuthConfig } from "./light-auth-config";
import { type LightAuthSession, type LightAuthUser } from "./light-auth-session";

export interface LightAuthUserAdapter {
  getUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    userId: string | number;
    [key: string]: unknown;
  }) => User | null | Promise<User | null>;
  setUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    user: User;
    [key: string]: unknown;
  }) => Promise<void>;
  deleteUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
    config: LightAuthConfig<Session, User>;
    user: User;
    [key: string]: unknown;
  }) => Promise<void>;
}
