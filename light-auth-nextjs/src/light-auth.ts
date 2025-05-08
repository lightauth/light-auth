import {
  createHttpHandlerFunction,
  createLightAuthSessionFunction,
  createLightAuthUserFunction,
  createSigninFunction,
  createSignoutFunction,
  LightAuthConfig,
  LightAuthProvider,
  LightAuthSession,
  LightAuthUser,
  resolveBasePath,
} from "@light-auth/core";
import { createLightAuthUserAdapter } from "@light-auth/core/adapters";
import { nextJsLightAuthRouter } from "./nextjs-light-auth-router";
import { nextJsLightAuthSessionStore } from "./nextjs-light-auth-session-store";
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
  signIn: (providerName?: string) => Promise<void>;
  signOut: (revokeToken?: boolean) => Promise<void>;
  getSession: () => Promise<LightAuthSession | null | undefined>;
  getUser: () => Promise<LightAuthUser | null | undefined>;
}

/**
 * createNextJsSignIn is a function that creates a sign-in function for Next.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsSignIn = (config: LightAuthConfig): ((providerName?: string) => Promise<void>) => {
  const signIn = createSigninFunction(config);
  return async (providerName?: string) => await signIn({ providerName });
};

/**
 * createNextJsSignOut is a function that creates a sign-out function for Next.js.
 * It takes the LightAuth createSignoutFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsSignOut = (config: LightAuthConfig): ((revokeToken?: boolean) => Promise<void>) => {
  const signOut = createSignoutFunction(config);
  return async (revokeToken?: boolean) => await signOut({ revokeToken });
};

/**
 * createNextJsLightAuthSessionFunction is a function that creates a light session function for Next.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsLightAuthSessionFunction = (config: LightAuthConfig): (() => Promise<LightAuthSession | null | undefined>) => {
  const lightAuthSession = createLightAuthSessionFunction(config);
  return async () => await lightAuthSession();
};

/**
 * createNextJsLightAuthUserFunction is a function that creates a light user function for Next.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsLightAuthUserFunction = (config: LightAuthConfig): (() => Promise<LightAuthUser | null | undefined>) => {
  const lightAuthUser = createLightAuthUserFunction(config);
  return async () => await lightAuthUser();
};

type NextJsLightAuthHandlerFunction = (req: NextRequest, res: NextResponse, ...params: any[]) => Promise<NextResponse>;
type NextJsLightAuthHandlerFullFunction = { GET: NextJsLightAuthHandlerFunction; POST: NextJsLightAuthHandlerFunction };

/**
 * createNextJsLightAuthHandlerFunction is a function that creates the light auth handler for Next.js.
 * It takes the LightAuth createHttpHandlerFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Next.js context.
 */
export const createNextJsLightAuthHandlerFunction = (config: LightAuthConfig): NextJsLightAuthHandlerFullFunction => {
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
export function CreateLightAuth(config: LightAuthConfig): LightAuthNextJsComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("light-auth: At least one provider is required");

  config.userAdapter = config.userAdapter ?? createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
  config.router = config.router ?? nextJsLightAuthRouter;
  config.sessionStore = config.sessionStore ?? nextJsLightAuthSessionStore;
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
