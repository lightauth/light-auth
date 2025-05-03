import {
  createLightAuthSessionFunction,
  createHttpHandlerFunction,
  createLightAuthUserFunction,
  createSigninFunction,
  createUserStore,
  DEFAULT_BASE_PATH,
  createSignoutFunction,
  LightAuthConfig,
  LightAuthProvider,
  LightAuthSession,
  LightAuthUser,
} from "@light-auth/core";
import { nextJsNavigatorStore } from "./store/nextjs-navigator-store";
import { nextJsCookieStore } from "./store/nextjs-cookie-store";
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

/**
 * CreateLightAuth is a function that creates the LightAuth components for Next.js.
 * It takes a LightAuthConfig object as a parameter and returns a LightAuthNextJsComponents object.
 * The function also sets default values for the userStore, navigatoreStore, and cookieStore if they are not provided.
 */
export function CreateLightAuth(config: LightAuthConfig): LightAuthNextJsComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userStore = config.userStore ?? createUserStore({ base: "./users", isEncrypted: false });
  config.navigatoreStore = config.navigatoreStore ?? nextJsNavigatorStore;
  config.cookieStore = config.cookieStore ?? nextJsCookieStore;

  return {
    providers: config.providers,
    handlers: {
      GET: createHttpHandlerFunction(config),
      POST: createHttpHandlerFunction(config),
    },
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createNextJsSignIn(config),
    signOut: createNextJsSignOut(config),
    getSession: createNextJsLightAuthSessionFunction(config),
    getUser: createNextJsLightAuthUserFunction(config),
  };
}
