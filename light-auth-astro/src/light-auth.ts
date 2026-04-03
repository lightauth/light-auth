import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createHttpHandlerFunction,
  createFetchSessionServerFunction,
  createFetchUserServerFunction,
  getUserDirect,
  createSigninServerFunction,
  createSignoutServerFunction,
  resolveBasePath,
  createSetSessionServerFunction,
  createSetUserServerFunction,
} from "@light-auth/core";

import type { APIRoute, AstroSharedContext } from "astro";

const createGetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const getSession = createFetchSessionServerFunction(config);
  return async (context: AstroSharedContext) => await getSession({ context });
};

const createSetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setSession = createSetSessionServerFunction(config);
  return async (context: AstroSharedContext, session: Session) => await setSession({ context, session });
};

export const createGetAuthUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  return async (context: AstroSharedContext, providerUserId?: string) =>
    await getUserDirect<Session, User>({ config, providerUserId, context });
};

const createSetAuthUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setUser = createSetUserServerFunction(config);
  return async (context: AstroSharedContext, user: User) => await setUser({ context, user });
};

export function createSignin<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signInFunction = createSigninServerFunction(config);
  return async (context: AstroSharedContext, providerName?: string, callbackUrl: string = "/") => {
    return await signInFunction({ providerName, callbackUrl, context });
  };
}

export function createSignout<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOutFunction = createSignoutServerFunction(config);
  return async (context: AstroSharedContext, revokeToken: boolean = false, callbackUrl: string = "/") => {
    return await signOutFunction({ revokeToken, callbackUrl, context });
  };
}

export const createHandler = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): { GET: APIRoute; POST: APIRoute } => {
  const lightAuthHandler = createHttpHandlerFunction(config);

  return {
    GET: async (context?: AstroSharedContext) => {
      const response = await lightAuthHandler({ context });
      return response;
    },
    POST: async (context?: AstroSharedContext) => {
      const response = await lightAuthHandler({ context });
      return response;
    },
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
  // Using Promise.all to ensure all imports are resolved before any handler is called
  const pendingImports: Promise<void>[] = [];

  if (!config.userAdapter && typeof window === "undefined") {
    pendingImports.push(
      import("@light-auth/core/adapters").then((module) => {
        config.userAdapter = module.createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
      })
    );
  }

  if (!config.sessionStore && typeof window === "undefined") {
    pendingImports.push(
      import("./astro-light-auth-session-store").then((module) => {
        config.sessionStore = module.astroLightAuthSessionStore;
      })
    );
  }
  if (!config.router && typeof window === "undefined") {
    pendingImports.push(
      import("./astro-light-auth-router").then((module) => {
        config.router = module.astroLightAuthRouter;
      })
    );
  }

  const importsReady = Promise.all(pendingImports);

  // @ts-ignore
  config.env = config.env || import.meta.env;
  config.basePath = resolveBasePath(config.basePath, config.env);

  if (!config.env || !config.env["LIGHT_AUTH_SECRET_VALUE"]) throw new Error("LIGHT_AUTH_SECRET_VALUE is required in environment variables");

  const handler = createHandler(config);

  // Wrap all async functions to ensure dynamic imports are resolved before executing
  const ensureReady = <T extends (...args: any[]) => Promise<any>>(fn: T): T =>
    (async (...args: any[]) => { await importsReady; return fn(...args); }) as unknown as T;

  return {
    providers: config.providers,
    handlers: {
      GET: ensureReady(handler.GET),
      POST: ensureReady(handler.POST),
    },
    basePath: config.basePath,
    getAuthSession: ensureReady(createGetAuthSession(config)),
    setAuthSession: ensureReady(createSetAuthSession(config)),
    getUser: ensureReady(createGetAuthUser(config)),
    setUser: ensureReady(createSetAuthUser(config)),
    signIn: ensureReady(createSignin(config)),
    signOut: ensureReady(createSignout(config)),
  };
}
