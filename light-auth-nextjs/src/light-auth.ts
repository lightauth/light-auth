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
  createSetSessionServerFunction,
  createSetUserServerFunction,
} from "@light-auth/core";

import { NextRequest, NextResponse } from "next/server";

/**
 * createNextJsSignIn is a function that creates a sign-in function for Next.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
const createSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signIn = createSigninServerFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => signIn({ providerName, callbackUrl, config });
};

/**
 * createNextJsSignOut is a function that creates a sign-out function for Next.js.
 * It takes the LightAuth createSignoutFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
const createSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOut = createSignoutServerFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    await signOut({ revokeToken, callbackUrl, config });
  };
};

/**
 * createNextJsLightAuthSessionFunction is a function that creates a light session function for Next.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
const createGetSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (() => Promise<Session | null | undefined>) => {
  const getSession = createFetchSessionServerFunction(config);
  return async () => await getSession({ config });
};

const createSetSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setSession = createSetSessionServerFunction(config);
  return async (session: Session) => await setSession({ session, config });
};

/**
 * createNextJsLightAuthUserFunction is a function that creates a light user function for Next.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
const createGetAuthUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const getUser = createFetchUserServerFunction(config);
  return async (providerUserId?: string) => await getUser({ providerUserId, config });
};

const createSetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setUser = createSetUserServerFunction(config);
  return async (user: User) => await setUser({ user, config });
};

/**
 * createNextJsLightAuthHandlerFunction is a function that creates the light auth handler for Next.js.
 * It takes the LightAuth createHttpHandlerFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
const createHandler = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const lightAuthHandler = createHttpHandlerFunction(config);
  return {
    GET: async (req: NextRequest, ...params: any[]) => {
      const response = await lightAuthHandler({ req, ...params });
      return response;
    },
    POST: async (req: NextRequest, ...params: any[]) => {
      const response = await lightAuthHandler({ req, ...params });
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

  if (!config.env["LIGHT_AUTH_SECRET_VALUE"]) throw new Error("LIGHT_AUTH_SECRET_VALUE is required in environment variables");

  return {
    providers: config.providers,
    handlers: createHandler(config),
    basePath: config.basePath,
    signIn: createSignIn(config),
    signOut: createSignOut(config),
    getAuthSession: createGetSession(config),
    setAuthSession: createSetSession(config),
    getUser: createGetAuthUser(config),
    setUser: createSetUser(config),
  };
}
