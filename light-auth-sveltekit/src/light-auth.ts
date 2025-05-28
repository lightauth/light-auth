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
} from "@light-auth/core";
import { type RequestEvent } from "@sveltejs/kit";

export const createSvelteKitLightAuthSessionFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const sessionFunction = createFetchSessionServerFunction(config);
  return async (event: RequestEvent) => {
    return await sessionFunction({ event });
  };
};

export const createSvelteKitLightAuthUserFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const userFunction = createFetchUserServerFunction(config);
  return async (event: RequestEvent, userId?: string) => {
    return await userFunction({ userId, event });
  };
};

export function createSvelteKitSigninFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>) {
  const signInFunction = createSigninServerFunction(config);
  return async (event: RequestEvent, providerName?: string, callbackUrl: string = "/") => {
    return await signInFunction({ providerName, callbackUrl, event });
  };
}

export function createSvelteKitSignoutFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>) {
  const signOutFunction = createSignoutServerFunction(config);
  return async (event: RequestEvent, revokeToken: boolean = false, callbackUrl: string = "/") => {
    return await signOutFunction({ revokeToken, callbackUrl, event });
  };
}

export const createSvelteKitLightAuthHandlerFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
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
    handlers: createSvelteKitLightAuthHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    getAuthSession: createSvelteKitLightAuthSessionFunction(config),
    getUser: createSvelteKitLightAuthUserFunction(config),
    signIn: createSvelteKitSigninFunction(config),
    signOut: createSvelteKitSignoutFunction(config),
  };
}
