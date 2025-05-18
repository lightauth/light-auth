import {
  createHttpHandlerFunction,
  createFetchSessionFunction,
  createFetchUserFunction,
  createSigninFunction,
  createSignoutFunction,
  LightAuthConfig,
  LightAuthProvider,
  LightAuthSession,
  LightAuthUser,
  resolveBasePath,
} from "@light-auth/core";

import { NextRequest, NextResponse } from "next/server";

/**
 * LightAuthNextJsComponents is an interface that defines the structure of the LightAuth components for Next.js.
 * It includes the providers, base path, handlers for GET and POST requests, and functions for signing in,
 * signing out, and retrieving the light session and user.
 */
export interface LightAuthNextJsComponents {
  providers: LightAuthProvider[];
  basePath: string;
  handlers: {
    GET: (req: NextRequest, res: NextResponse, ...params: any[]) => Promise<NextResponse>;
    POST: (req: NextRequest, res: NextResponse, ...params: any[]) => Promise<NextResponse>;
  };
  signIn: (providerName?: string, callbackUrl?: string) => Promise<NextResponse>;
  signOut: (revokeToken?: boolean, callbackUrl?: string) => Promise<NextResponse>;
  getSession: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>() => Promise<
    Session | null | undefined
  >;
  getUser: <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>() => Promise<
    User | null | undefined
  >;
}

/**
 * createNextJsSignIn is a function that creates a sign-in function for Next.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signIn = createSigninFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => {
    return await signIn({ providerName, callbackUrl });
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
  const signOut = createSignoutFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    return await signOut({ revokeToken, callbackUrl });
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
  const lightAuthSession = createFetchSessionFunction(config);
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
  const lightAuthUser = createFetchUserFunction(config);
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
 * It takes a LightAuthConfig object as a parameter and returns a LightAuthNextJsComponents object.
 * The function also sets default values for the userAdapter, router and cookieStore if they are not provided.
 */
export function CreateLightAuth<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
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

  config.basePath = resolveBasePath(config);
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
