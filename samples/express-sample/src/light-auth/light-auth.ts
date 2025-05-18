import {
  LightAuthCookie,
  createHttpHandlerFunction,
  DEFAULT_BASE_PATH,
  LightAuthConfig,
  LightAuthProvider,
  LightAuthSession,
  LightAuthUser,
  resolveBasePath,
  createSigninFunction,
  createSignoutFunction,
  createFetchSessionFunction,
  createFetchUserFunction,
} from "@light-auth/core";
import { createLightAuthUserAdapter } from "@light-auth/core/adapters";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";
import { expressLightAuthRouter } from "./express-light-auth-router";
import { expressLightAuthSessionStore } from "./express-light-auth-session-store";

export interface LightAuthExpressComponents {
  providers: LightAuthProvider[];
  handlers: (req: ExpressRequest, res: ExpressResponse, next: NextFunction, ...params: any[]) => Promise<void>;
  middleware: (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => Promise<void>;
  signIn: (req: ExpressRequest, res: ExpressResponse, providerName?: string, callbackUrl?: string) => Promise<void>;
  signOut: (req: ExpressRequest, res: ExpressResponse, revokeToken?: boolean, callbackUrl?: string) => Promise<void>;
  basePath: string;
  getSession: (req: ExpressRequest, res: ExpressResponse) => Promise<LightAuthSession | null | undefined>;
  getUser: (req: ExpressRequest, res: ExpressResponse) => Promise<LightAuthUser | null | undefined>;
}

export const createExpressLightAuthHandlerFunction = (config: LightAuthConfig) => {
  const lightAuthHandler = createHttpHandlerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction, ...params: any[]) => {
    await lightAuthHandler({ req, res, next, ...params });
    if (!res.headersSent) next();
  };
};

export const createExpressLightAuthMiddlewareFunction = (config: LightAuthConfig) => {
  const sessionFunction = createFetchSessionFunction(config);

  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction, ...params: any[]) => {
    const session = await sessionFunction({ req, res });
    res.locals.session = session;
    return next();
  };
};

export const createExpressLightAuthSignIn = (config: LightAuthConfig) => {
  const signIn = createSigninFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, providerName?: string, callbackUrl: string = "/") => {
    await signIn({ providerName, req, res, callbackUrl });
    if (!res.headersSent) res.end();
  };
};

export const createExpressLightAuthSignOut = (config: LightAuthConfig) => {
  const signOut = createSignoutFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, revokeToken?: boolean, callbackUrl: string = "/") => {
    await signOut({ revokeToken, req, res, callbackUrl });
    if (!res.headersSent) res.end();
  };
};

export const createExpressLightAuthSessionFunction = (config: LightAuthConfig) => {
  const sessionFunction = createFetchSessionFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse): Promise<LightAuthSession | null | undefined> => {
    const session = await sessionFunction({ req, res });
    return session;
  };
};

export const createExpressLightAuthUserFunction = (config: LightAuthConfig) => {
  const userFunction = createFetchUserFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse): Promise<LightAuthUser | null | undefined> => {
    return await userFunction({ req, res });
  };
};

export function CreateLightAuth(config: LightAuthConfig): LightAuthExpressComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userAdapter = config.userAdapter ?? createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
  config.router = config.router ?? expressLightAuthRouter;
  config.sessionStore = config.sessionStore ?? expressLightAuthSessionStore;
  config.basePath = resolveBasePath(config);
  config.env = config.env || process.env;
  return {
    providers: config.providers,
    handlers: createExpressLightAuthHandlerFunction(config),
    middleware: createExpressLightAuthMiddlewareFunction(config),
    basePath: config.basePath,
    signIn: createExpressLightAuthSignIn(config),
    signOut: createExpressLightAuthSignOut(config),
    getSession: createExpressLightAuthSessionFunction(config),
    getUser: createExpressLightAuthUserFunction(config),
  };
}
