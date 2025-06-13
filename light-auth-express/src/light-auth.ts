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
  createSetSessionServerFunction,
  createSetUserServerFunction,
} from "@light-auth/core";
import { type Request as ExpressRequest, type Response as ExpressResponse, type NextFunction } from "express";

const createGetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const getSession = createFetchSessionServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse) => await getSession({ req, res });
};

const createSetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setSession = createSetSessionServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, session: Session) => await setSession({ req, res, session });
};

const createGetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const getUser = createFetchUserServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, providerUserId?: string) => await getUser({ req, res, providerUserId });
};

const createSetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setUser = createSetUserServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, user: User) => await setUser({ req, res, user });
};

function createSignin<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signInFunction = createSigninServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, providerName?: string, callbackUrl: string = "/") =>
    await signInFunction({ providerName, callbackUrl, req, res });
}

export function createSignout<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOut = createSignoutServerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, revokeToken: boolean = false, callbackUrl: string = "/") =>
    await signOut({ revokeToken, callbackUrl, req, res });
}

export const createAuthHandler = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const lightAuthHandler = createHttpHandlerFunction(config);
  return async (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    await lightAuthHandler({ req, res, next });
    if (!res.headersSent) next();
  };
};

export const createMiddleware = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
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
  config.basePath = resolveBasePath(config.basePath, config.env);

  if (!config.env["LIGHT_AUTH_SECRET_VALUE"]) throw new Error("LIGHT_AUTH_SECRET_VALUE is required in environment variables");

  return {
    providers: config.providers,
    handlers: createAuthHandler(config),
    middleware: createMiddleware(config),
    basePath: config.basePath,
    getAuthSession: createGetAuthSession(config),
    setAuthSession: createSetAuthSession(config),
    getUser: createGetUser(config),
    setUser: createSetUser(config),
    signIn: createSignin(config),
    signOut: createSignout(config),
  };
}
