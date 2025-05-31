import {
  DEFAULT_BASE_PATH,
  type LightAuthConfig,
  createHttpHandlerFunction,
  createFetchSessionServerFunction,
  createFetchUserServerFunction,
  createSigninServerFunction,
  createSignoutServerFunction,
  type LightAuthSession,
  type LightAuthUser,
  resolveBasePath,
  createSetUserServerFunction,
} from "@light-auth/core";
import { type RequestEvent } from "@sveltejs/kit";

const createGetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const getSession = createFetchSessionServerFunction(config);
  return async (event: RequestEvent) => await getSession({ event });
};

const createSetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setSession = createFetchSessionServerFunction(config);
  return async (event: RequestEvent, session: Session) => await setSession({ event, session });
};

const createGetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const getUser = createFetchUserServerFunction(config);
  return async (event: RequestEvent, userId?: string) => await getUser({ userId, event });
};

const createSetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setUser = createSetUserServerFunction(config);
  return async (event: RequestEvent, user: User) => await setUser({ event, user });
};

function createSignin<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signIn = createSigninServerFunction(config);
  return async (event: RequestEvent, providerName?: string, callbackUrl: string = "/") => await signIn({ providerName, callbackUrl, event });
}

function createSignout<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOut = createSignoutServerFunction(config);
  return async (event: RequestEvent, revokeToken: boolean = false, callbackUrl: string = "/") => await signOut({ revokeToken, callbackUrl, event });
}

const createHandler = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const lightAuthHandler = createHttpHandlerFunction(config);

  return {
    GET: async (event?: RequestEvent) => {
      const response = await lightAuthHandler({ event });
      return response;
    },
    POST: async (event?: RequestEvent) => {
      const response = await lightAuthHandler({ event });
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
    import("./sveltekit-light-auth-session-store").then((module) => {
      config.sessionStore = module.sveltekitLightAuthSessionStore;
    });
  }
  if (!config.router && typeof window === "undefined") {
    import("./sveltekit-light-auth-router").then((module) => {
      config.router = module.sveltekitLightAuthRouter;
    });
  }

  config.env = config.env || process.env;
  config.basePath = resolveBasePath(config.basePath, config.env);

  return {
    providers: config.providers,
    handlers: createHandler(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    getAuthSession: createGetAuthSession(config),
    setAuthSession: createSetAuthSession(config),
    getUser: createGetUser(config),
    setUser: createSetUser(config),
    signIn: createSignin(config),
    signOut: createSignout(config),
  };
}
