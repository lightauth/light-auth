import {
  DEFAULT_BASE_PATH,
  type LightAuthConfig,
  type LightAuthProvider,
  type LightAuthSession,
  type LightAuthUser,
  type LightAuthComponents,
  createHttpHandlerFunction,
  createFetchSessionFunction,
  createFetchUserFunction,
  createSigninFunction,
  createSignoutFunction,
} from "@light-auth/core";

import type { APIContext, APIRoute } from "astro";

export const createAstroLightAuthSessionFunction = (config: LightAuthConfig) => {
  const sessionFunction = createFetchSessionFunction(config);
  return async (req?: Request) => {
    return await sessionFunction({ req });
  };
};

export const createAstroLightAuthUserFunction = (config: LightAuthConfig) => {
  const userFunction = createFetchUserFunction(config);
  return async (req?: Request) => {
    return await userFunction({ req });
  };
};

export function createAstroSigninFunction(config: LightAuthConfig) {
  const signInFunction = createSigninFunction(config);
  return async (providerName: string) => {
    return await signInFunction({ providerName });
  };
}

export function createAstroSignoutFunction(config: LightAuthConfig) {
  const signOutFunction = createSignoutFunction(config);
  return async () => {
    return await signOutFunction();
  };
}

export const createAstroLightAuthHandlerFunction = (config: LightAuthConfig): { GET: APIRoute; POST: APIRoute } => {
  const lightAuthHandler = createHttpHandlerFunction(config);

  return {
    GET: async (context?: APIContext) => {
      const response = await lightAuthHandler({ context });
      return response;
    },
    POST: async (context?: APIContext) => {
      const response = await lightAuthHandler({ context });
      return response;
    },
  };
};

export function CreateLightAuth(config: LightAuthConfig) {
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
  config.env = config.env || import.meta;

  return {
    providers: config.providers,
    handlers: createAstroLightAuthHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    getSession: createAstroLightAuthSessionFunction(config),
    getUser: createAstroLightAuthUserFunction(config),
    signIn: createAstroSigninFunction(config),
    signOut: createAstroSignoutFunction(config),
  };
}
