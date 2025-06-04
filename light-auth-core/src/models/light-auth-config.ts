import { OAuth2Tokens } from "arctic";
import { type LightAuthProvider } from "./light-auth-provider";
import { type LightAuthSession, type LightAuthUser } from "./light-auth-session";
import { type LightAuthUserAdapter } from "./light-auth-user-adapter";
import { type LightAuthSessionStore } from "./light-auth-session-store";
import { type LightAuthRouter } from "./light-auth-router";
import type { LightAuthServerEnv } from "./light-auth-server-env";
import type { LightAuthRateLimiter } from "./light-auth-rate-limit";

export type LightAuthConfig<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>> = {
  providers?: LightAuthProvider[];
  onSessionSaving?: (session: Session, claims?: OAuth2Tokens, metadata?: { [key: string]: unknown }) => Session | null | Promise<Session | null>;
  onSessionSaved?: (session: Session, metadata?: { [key: string]: unknown }) => void | Promise<void>;
  onUserSaving?: (user: User, claims?: OAuth2Tokens, metadata?: { [key: string]: unknown }) => User | null | Promise<User | null>;
  onUserSaved?: (user: User, metadata?: { [key: string]: unknown }) => void | Promise<void>;
  basePath?: string;
  userAdapter?: LightAuthUserAdapter;
  sessionStore?: LightAuthSessionStore;
  rateLimiter?: LightAuthRateLimiter;
  router?: LightAuthRouter;
  env?: LightAuthServerEnv;
};
