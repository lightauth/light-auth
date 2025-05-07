import {
  createHttpHandlerFunction,
  createLightAuthUserFunction,
  createLightAuthSessionFunction,
  DEFAULT_BASE_PATH,
  type LightAuthConfig,
  type LightAuthProvider,
  type LightAuthSession,
  type LightAuthUser,
  type LightAuthComponents,
} from "@light-auth/core";

import { astroLightAuthRouter } from "./astro-light-auth-router";
import type { APIContext, APIRoute, AstroSharedContext } from "astro";
import { astroLightAuthCookieStore } from "./astro-light-auth-cookie-store";
import { createSigninFunction, createSignoutFunction } from "@light-auth/core/client";

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

export const createAstroLightAuthSessionFunction = (config: LightAuthConfig) => {
  const sessionFunction = createLightAuthSessionFunction(config);
  return async (req?: Request) => {
    return await sessionFunction({ req });
  };
};

export const createAstroLightAuthUserFunction = (config: LightAuthConfig) => {
  const userFunction = createLightAuthUserFunction(config);
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
