import {
  DEFAULT_BASE_PATH,
  type LightAuthConfig,
  type LightAuthProvider,
  type LightAuthSession,
  type LightAuthUser,
  type LightAuthComponents,
  createHttpHandlerFunction,
  createServerSessionFunction,
  createServerUserFunction,
  createServerSigninFunction,
  createServerSignoutFunction,
} from "@light-auth/core";

import type { APIContext, APIRoute } from "astro";
import { astroLightAuthCookieStore } from "./astro-light-auth-cookie-store";

import { createLightAuthUserAdapter } from "@light-auth/core";
import { astroLightAuthRouter } from "./astro-light-auth-router";

/**
 * AstroLightAuthComponents is an interface that extends the LightAuthComponents interface.
 *
 * It includes the providers, base path, handlers for GET and POST requests, and functions for signing in,
 * signing out, and retrieving the light auth session and user.
 *
 * It get a strong typed version of the light auth components for Astro.
 */
export interface AstroLightAuthComponents extends LightAuthComponents {
  providers: LightAuthProvider[];
  handlers: {
    GET: APIRoute;
    POST: APIRoute;
  };
  basePath: string;
  getSession: (req?: Request) => Promise<LightAuthSession | null | undefined>;
  getUser: (req?: Request) => Promise<LightAuthUser | null | undefined>;
}

export const createAstroLightAuthSessionFunction = (config: LightAuthConfig) => {
  const sessionFunction = createServerSessionFunction(config);
  return async (req?: Request) => {
    return await sessionFunction({ req });
  };
};

export const createAstroLightAuthUserFunction = (config: LightAuthConfig) => {
  const userFunction = createServerUserFunction(config);
  return async (req?: Request) => {
    return await userFunction({ req });
  };
};

export function createAstroSigninFunction(config: LightAuthConfig) {
  const signInFunction = createServerSigninFunction(config);
  return async (providerName: string) => {
    return await signInFunction({ providerName });
  };
}

export function createAstroSignoutFunction(config: LightAuthConfig) {
  const signOutFunction = createServerSignoutFunction(config);
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

export function CreateLightAuth(config: LightAuthConfig): AstroLightAuthComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userAdapter = config.userAdapter ?? createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
  config.router = astroLightAuthRouter;
  config.sessionStore = astroLightAuthCookieStore;
  config.env = config.env || import.meta.env;

  return {
    providers: config.providers,
    handlers: createAstroLightAuthHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    getSession: createAstroLightAuthSessionFunction(config),
    getUser: createAstroLightAuthUserFunction(config),
  };
}
