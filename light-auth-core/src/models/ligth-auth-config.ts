import { OAuth2Tokens } from "arctic";
import { LightAuthSession } from "..";
import { LightAuthCookieStore } from "../light-auth-cookie-store";
import { LightAuthRouter } from "../light-auth-router";
import { LightAuthUserAdapter } from "../light-auth-user-adapter";
import { LightAuthProvider } from "./light-auth-provider";
import { LightAuthUser } from "./light-auth-session";

export interface LightAuthConfig {
  providers: LightAuthProvider[];
  onSessionSaving?: (session: LightAuthSession, claims: OAuth2Tokens) => LightAuthSession | null | Promise<LightAuthSession | null>;
  onSessionSaved?: (session: LightAuthSession) => void | Promise<void>;
  onUserSaving?: (user: LightAuthUser, claims: OAuth2Tokens) => LightAuthUser | null | Promise<LightAuthUser | null>;
  onUserSaved?: (user: LightAuthUser) => void | Promise<void>;
  basePath?: string;
  userStore?: LightAuthUserAdapter;
  cookieStore?: LightAuthCookieStore;
  navigatoreStore?: LightAuthRouter;
}
