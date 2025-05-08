import { OAuth2Tokens } from "arctic";
import { LightAuthProvider } from "./light-auth-provider";
import { LightAuthSession, LightAuthUser } from "./light-auth-session";
import { LightAuthUserAdapter } from "./light-auth-user-adapter";
import { LightAuthCookieStore } from "./light-auth-cookie-store";
import { LightAuthRouter } from "./light-auth-router";

export interface LightAuthConfig {
  providers: LightAuthProvider[];
  onSessionSaving?: (session: LightAuthSession, claims: OAuth2Tokens) => LightAuthSession | null | Promise<LightAuthSession | null>;
  onSessionSaved?: (session: LightAuthSession) => void | Promise<void>;
  onUserSaving?: (user: LightAuthUser, claims: OAuth2Tokens) => LightAuthUser | null | Promise<LightAuthUser | null>;
  onUserSaved?: (user: LightAuthUser) => void | Promise<void>;
  basePath?: string;
  userAdapter?: LightAuthUserAdapter;
  cookieStore?: LightAuthCookieStore;
  router?: LightAuthRouter;
  env?: { [key: string]: string | undefined };
}
