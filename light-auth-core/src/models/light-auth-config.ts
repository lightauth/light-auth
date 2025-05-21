import { OAuth2Tokens } from "arctic";
import { LightAuthProvider } from "./light-auth-provider";
import { LightAuthSession, LightAuthUser } from "./light-auth-session";
import { LightAuthUserAdapter } from "./light-auth-user-adapter";
import { LightAuthSessionStore } from "./light-auth-session-store";
import { LightAuthRouter } from "./light-auth-router";

export type LightAuthConfig<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>> = {
  providers?: LightAuthProvider[];
  onSessionSaving?: (session: Session, claims: OAuth2Tokens, metadata?: { [key: string]: unknown }) => Session | null | Promise<Session | null>;
  onSessionSaved?: (session: Session, metadata?: { [key: string]: unknown }) => void | Promise<void>;
  onUserSaving?: (user: User, claims: OAuth2Tokens, metadata?: { [key: string]: unknown }) => User | null | Promise<User | null>;
  onUserSaved?: (user: User, metadata?: { [key: string]: unknown }) => void | Promise<void>;
  basePath?: string;
  userAdapter?: LightAuthUserAdapter;
  sessionStore?: LightAuthSessionStore;
  router?: LightAuthRouter;
  env?: { [key: string]: string | undefined };
};
