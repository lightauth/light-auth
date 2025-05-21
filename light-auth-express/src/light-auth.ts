import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createHttpHandlerFunction,
  createFetchSessionServerFunction,
  createFetchUserServerFunction,
  createSigninServerFunction,
  createSignoutServerFunction,
  resolveBasePath,
} from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";

export const createExpressLightAuthSessionFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const sessionFunction = createFetchSessionServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse) => {
    return await sessionFunction({ req, res });
  };
};

export const createExpressLightAuthUserFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const userFunction = createFetchUserServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse) => {
    return await userFunction({ req, res });
  };
};

export function createExpressSigninFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signInFunction = createSigninServerFunction(config);
  return async (providerName: string, callbackUrl: string = "/", req: ExpressRequest, res: ExpressResponse) => {
    return await signInFunction({ providerName, callbackUrl, req, res });
  };
}

export function createExpressSignoutFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOutFunction = createSignoutServerFunction(config);
  return async (revokeToken: boolean = false, callbackUrl: string = "/", req: ExpressRequest, res: ExpressResponse) => {
    return await signOutFunction({ revokeToken, callbackUrl, req, res });
  };
}

export const createExpressLightAuthHandlerFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const lightAuthHandler = createHttpHandlerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    await lightAuthHandler({ req, res, next });
    if (!res.headersSent) next();
  };
};

export const createExpressLightAuthMiddlewareFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const sessionFunction = createFetchSessionServerFunction(config);

  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction, ...params: any[]) => {
    const session = await sessionFunction({ req });
    res.locals.session = session;
    return next();
  };
};
export function CreateLightAuth<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  // check if we are on the server side
  const isServerSide = typeof window === "undefined";
  if (!isServerSide)
    throw new Error("light-auth-nextjs: DO NOT use this function [CreateLightAuth] on the client side as you may expose sensitive data to the client.");

  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  // dynamic imports to avoid error if we are on the client side
  if (!config.userAdapter && typeof window === "undefined") {
    import("@light-auth/core/adapters").then((module) => {
      config.userAdapter = module.createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
    });
  }

  if (!config.sessionStore && typeof window === "undefined") {
    import("./express-light-auth-session-store").then((module) => {
      config.sessionStore = module.expressLightAuthSessionStore;
    });
  }
  if (!config.router && typeof window === "undefined") {
    import("./express-light-auth-router").then((module) => {
      config.router = module.expressLightAuthRouter;
    });
  }

  // @ts-ignore
  config.env = config.env || process.env;
  config.basePath = resolveBasePath(config);

  return {
    providers: config.providers,
    handlers: createExpressLightAuthHandlerFunction(config),
    middleware: createExpressLightAuthMiddlewareFunction(config),
    basePath: config.basePath,
    getSession: createExpressLightAuthSessionFunction(config),
    getUser: createExpressLightAuthUserFunction(config),
    signIn: createExpressSigninFunction(config),
    signOut: createExpressSignoutFunction(config),
  };
}
