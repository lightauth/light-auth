import {
  createHttpHandlerFunction,
  createFetchSessionServerFunction,
  createFetchUserServerFunction,
  createSigninServerFunction,
  createSignoutServerFunction,
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  resolveBasePath,
} from "@light-auth/core";

import { NextRequest, NextResponse } from "next/server";

/**
 * createNextJsSignIn is a function that creates a sign-in function for Next.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signIn = createSigninServerFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => {
    await signIn({ providerName, callbackUrl });
  };
};

/**
 * createNextJsSignOut is a function that creates a sign-out function for Next.js.
 * It takes the LightAuth createSignoutFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOut = createSignoutServerFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    await signOut({ revokeToken, callbackUrl });
  };
};

/**
 * createNextJsLightAuthSessionFunction is a function that creates a light session function for Next.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsLightAuthSessionFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
): (() => Promise<Session | null | undefined>) => {
  const lightAuthSession = createFetchSessionServerFunction(config);
  return async () => await lightAuthSession();
};

/**
 * createNextJsLightAuthUserFunction is a function that creates a light user function for Next.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsLightAuthUserFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
): (() => Promise<User | null | undefined>) => {
  const lightAuthUser = createFetchUserServerFunction(config);
  return async () => await lightAuthUser();
};

type NextJsLightAuthHandlerFunction = (req: NextRequest, res: NextResponse, ...params: any[]) => Promise<NextResponse>;
type NextJsLightAuthHandlerFullFunction = { GET: NextJsLightAuthHandlerFunction; POST: NextJsLightAuthHandlerFunction };

/**
 * createNextJsLightAuthHandlerFunction is a function that creates the light auth handler for Next.js.
 * It takes the LightAuth createHttpHandlerFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsLightAuthHandlerFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
): NextJsLightAuthHandlerFullFunction => {
  const lightAuthHandler = createHttpHandlerFunction(config);
  return {
    GET: async (req: NextRequest, res: NextResponse, ...params: any[]) => {
      const response = await lightAuthHandler({ req, res, ...params });
      return response;
    },
    POST: async (req: NextRequest, res: NextResponse, ...params: any[]) => {
      const response = await lightAuthHandler({ req, res, ...params });
      return response;
    },
  };
};

/**
 * CreateLightAuth is a function that creates the LightAuth components for Next.js.
 * The function also sets default values for the userAdapter, router and cookieStore if they are not provided.
 */
export function CreateLightAuth<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  // check if we are on the server side
  const isServerSide = typeof window === "undefined";
  if (!isServerSide)
    throw new Error("light-auth-nextjs: DO NOT use this function [CreateLightAuth] on the client side as you may expose sensitive data to the client.");

  if (!config.providers || config.providers.length === 0) throw new Error("light-auth: At least one provider is required");

  // dynamic imports to avoid error if we are on the client side
  if (!config.userAdapter && typeof window === "undefined") {
    import("@light-auth/core/adapters").then((module) => {
      config.userAdapter = module.createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
    });
  }

  if (!config.sessionStore && typeof window === "undefined") {
    import("./nextjs-light-auth-session-store").then((module) => {
      config.sessionStore = module.nextJsLightAuthSessionStore;
    });
  }
  if (!config.router && typeof window === "undefined") {
    import("./nextjs-light-auth-router").then((module) => {
      config.router = module.nextJsLightAuthRouter;
    });
  }

  config.basePath = resolveBasePath(config.basePath, config.env);
  config.env = config.env || process.env;
  return {
    providers: config.providers,
    handlers: createNextJsLightAuthHandlerFunction(config),
    basePath: config.basePath,
    signIn: createNextJsSignIn(config),
    signOut: createNextJsSignOut(config),
    getSession: createNextJsLightAuthSessionFunction(config),
    getUser: createNextJsLightAuthUserFunction(config),
  };
}
