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
} from "@light-auth/core";
import { astroLightAuthRouter } from "./astro-light-auth-router";
import type { APIContext, APIRoute, AstroSharedContext } from "astro";
import { astroLightAuthCookieStore } from "./astro-light-auth-cookie-store";

export interface LightAuthExpressComponents {
  providers: LightAuthProvider[];
  handlers: {
    GET: APIRoute;
    POST: APIRoute;
  };
  signIn: ({ req, res, providerName }: { req?: Request; res?: Response; providerName: string }) => Promise<Response>;
  signOut: ({ req, res }: { req?: Request; res: Response }) => Promise<Response>;
  basePath: string;
  getSession: () => Promise<LightAuthSession | null | undefined>;
  getUser: () => Promise<LightAuthUser | null | undefined>;
}

/**
 * createAstroLightAuthHandlerFunction is a function that creates the light auth handler for Astro.
 */
export const createAstroLightAuthHandlerFunction = (config: LightAuthConfig): { GET: APIRoute; POST: APIRoute } => {
  const lightAuthHandler = createHttpHandlerFunction(config);

  return {
    GET: async (context: APIContext) => {
      const response = await lightAuthHandler({ context });
      return response;
    },
    POST: async (context: APIContext) => {
      const response = await lightAuthHandler({ context });
      return response;
    },
  };
};

const createAstroLightAuthSessionFunction = (config: LightAuthConfig) => {
  const sessionFunction = createLightAuthSessionFunction(config);
  return async (context: AstroSharedContext) => {
    return await sessionFunction({ context });
  };
};

export function CreateLightAuth(
  config: LightAuthConfig
): LightAuthExpressComponents & { getAstroSession: (ctx: AstroSharedContext) => Promise<LightAuthSession | null | undefined> } {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userAdapter = config.userAdapter ?? createLightAuthUserAdapter({ base: "./users", isEncrypted: false, config });
  config.router = astroLightAuthRouter;
  config.cookieStore = astroLightAuthCookieStore;
  config.env = config.env || import.meta.env;

  return {
    providers: config.providers,
    handlers: createAstroLightAuthHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createSigninFunction(config),
    signOut: createSignoutFunction(config),
    getSession: createLightAuthSessionFunction(config),
    getUser: createLightAuthUserFunction(config),
    getAstroSession: createAstroLightAuthSessionFunction(config),
  };
}
