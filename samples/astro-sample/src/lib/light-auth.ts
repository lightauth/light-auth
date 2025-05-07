import {
  type LightAuthCookie,
  createHttpHandlerFunction,
  createLightAuthUserFunction,
  createLightAuthSessionFunction,
  createSigninFunction,
  createSignoutFunction,
  DEFAULT_BASE_PATH,
  type LightAuthConfig,
  type LightAuthProvider,
  type LightAuthSession,
  type LightAuthUser,
  createLightAuthUserAdapter,
  createLightAuthCookieStore,
  type LightAuthComponents,
  createSigninFunction2,
} from "@light-auth/core";
import { astroLightAuthRouter } from "./astro-light-auth-router";
import type { APIContext, APIRoute, AstroSharedContext } from "astro";
import { astroLightAuthCookieStore } from "./astro-light-auth-cookie-store";

/**
 * createAstroLightAuthHandlerFunction is a function that creates the light auth handler for Astro.
 */
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

const createAstroLightAuthSessionFunction = (config: LightAuthConfig) => {
  const sessionFunction = createLightAuthSessionFunction(config);
  return async (req?: Request) => {
    return await sessionFunction({ req });
  };
};

const createAstroLightAuthUserFunction = (config: LightAuthConfig) => {
  const userFunction = createLightAuthUserFunction(config);
  return async (req?: Request) => {
    return await userFunction({ req });
  };
};

export function CreateLightAuth(config: LightAuthConfig) {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userAdapter = config.userAdapter ?? createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false, config });
  config.router = astroLightAuthRouter;
  config.cookieStore = astroLightAuthCookieStore;
  config.env = config.env || import.meta.env;

  return {
    providers: config.providers,
    handlers: createAstroLightAuthHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    getSession: createAstroLightAuthSessionFunction(config),
    getUser: createAstroLightAuthUserFunction(config),
  };
}
