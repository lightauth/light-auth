import {
  DEFAULT_BASE_PATH,
  type LightAuthConfig,
  type LightAuthProvider,
  type LightAuthSession,
  type LightAuthUser,
  type LightAuthComponents,
} from "@light-auth/core";

import { astroLightAuthRouter } from "./astro-light-auth-router";
import type { APIRoute } from "astro";
import { astroLightAuthCookieStore } from "./astro-light-auth-cookie-store";
import {
  createAstroLightAuthHandlerFunction,
  createAstroLightAuthSessionFunction,
  createAstroLightAuthUserFunction,
  createAstroSigninFunction,
  createAstroSignoutFunction,
} from "./wrapper";

import { createLightAuthUserAdapter } from "@light-auth/core/adapters";

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

export function CreateLightAuth(config: LightAuthConfig): AstroLightAuthComponents {
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
