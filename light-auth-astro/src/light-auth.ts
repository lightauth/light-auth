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
  const getUser = createFetchUserServerFunction(config);
  return async (context: AstroSharedContext, providerUserId?: string) => await getUser({ providerUserId, context });
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
  if (!config.userAdapter && typeof window === "undefined") {
    import("@light-auth/core/adapters").then((module) => {
      config.userAdapter = module.createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
    });
  }

  if (!config.sessionStore && typeof window === "undefined") {
    import("./astro-light-auth-session-store").then((module) => {
      config.sessionStore = module.astroLightAuthSessionStore;
    });
  }
  if (!config.router && typeof window === "undefined") {
    import("./astro-light-auth-router").then((module) => {
      config.router = module.astroLightAuthRouter;
    });
  }

  // @ts-ignore
  config.env = config.env || import.meta.env;
  config.basePath = resolveBasePath(config.basePath, config.env);

  if (!config.env || !config.env["LIGHT_AUTH_SECRET_VALUE"]) throw new Error("LIGHT_AUTH_SECRET_VALUE is required in environment variables");

  return {
    providers: config.providers,
    handlers: createHandler(config),
    basePath: config.basePath,
    getAuthSession: createGetAuthSession(config),
    setAuthSession: createSetAuthSession(config),
    getUser: createGetAuthUser(config),
    setUser: createSetAuthUser(config),
    signIn: createSignin(config),
    signOut: createSignout(config),
  };
}
