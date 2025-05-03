import {
  LightAuthCookie,
  createHttpHandlerFunction,
  createLightAuthUserFunction,
  createLightAuthSessionFunction,
  createSigninFunction,
  createSignoutFunction,
  DEFAULT_BASE_PATH,
  LightAuthConfig,
  LightAuthProvider,
  LightAuthSession,
  LightAuthUser,
  createLightAuthUserAdapter,
} from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { expressLightAuthRouter } from "./express-light-auth-router";
import { expressLightAuthCookieStore } from "./express-light-auth-cookie-store";

export interface LightAuthExpressComponents {
  providers: LightAuthProvider[];
  handlers: (req: ExpressRequest, res: ExpressResponse, ...params: any[]) => Promise<ExpressResponse>;
  signIn: ({ req, res, providerName }: { req?: ExpressRequest; res?: ExpressResponse; providerName: string }) => Promise<ExpressResponse>;
  signOut: ({ req, res }: { req?: ExpressRequest; res: ExpressResponse }) => Promise<ExpressResponse>;
  basePath: string;
  getSession: () => Promise<LightAuthSession | null | undefined>;
  getUser: () => Promise<LightAuthUser | null | undefined>;
}

export function CreateLightAuth(config: LightAuthConfig): LightAuthExpressComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userAdapter = config.userAdapter ?? createLightAuthUserAdapter({ base: "./users", isEncrypted: false });
  config.router = expressLightAuthRouter;
  config.cookieStore = config.cookieStore ?? expressLightAuthCookieStore;

  return {
    providers: config.providers,
    handlers: createHttpHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createSigninFunction(config),
    signOut: createSignoutFunction(config),
    getSession: createLightAuthSessionFunction(config),
    getUser: createLightAuthUserFunction(config),
  };
}
