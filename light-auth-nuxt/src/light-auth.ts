import {
  createHttpHandlerFunction,
  createSigninServerFunction,
  createSignoutServerFunction,
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  resolveBasePath,
} from "@light-auth/core";
import { type EventHandlerRequest, type EventHandlerResponse, H3Event } from "h3";

import { createNuxtJsLightAuthSessionFunction, createNuxtJsLightAuthUserFunction } from "./client/index";

/**
 * createNuxtJsLightAuthSessionFunction is a function that creates a light session function for Nuxt.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthSessionServerFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const isServerSide = typeof window === "undefined";
  if (!isServerSide) throw new Error("light-auth: getSession function should not be called on the client side. prefer to use the client version.");

  return createNuxtJsLightAuthSessionFunction(config);
};

/**
 * createNuxtJsLightAuthUserFunction is a function that creates a light user function for Nuxt.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthUserServerFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const isServerSide = typeof window === "undefined";
  if (!isServerSide) throw new Error("light-auth: getUser function should not be called on the client side. prefer to use the client version.");

  return createNuxtJsLightAuthUserFunction(config);
};

/**
 * createNuxtJsSignIn is a function that creates a sign-in function for Nuxt.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signIn = createSigninServerFunction(config);
  return async (providerName?: string, callbackUrl: string = "/", event?: H3Event<EventHandlerRequest>) => {
    await signIn({ providerName, callbackUrl, event });
  };
};

/**
 * createNuxtJsSignOut is a function that creates a sign-out function for Nuxt.js.
 * It takes the LightAuth createSignoutFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOut = createSignoutServerFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/", event?: H3Event<EventHandlerRequest>) => {
    await signOut({ revokeToken, callbackUrl, event });
  };
};

type NuxtJsLightAuthHandlerFunction = (event: H3Event<EventHandlerRequest>) => EventHandlerResponse;

/**
 * createNuxtJsLightAuthHandlerFunction is a function that creates the light auth handler for Nuxt.js.
 * It takes the LightAuth createHttpHandlerFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthHandlerFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
): NuxtJsLightAuthHandlerFunction => {
  const lightAuthHandler = createHttpHandlerFunction(config);
  const nuxtJsLightAuthHandler: NuxtJsLightAuthHandlerFunction = async (event: H3Event<EventHandlerRequest>) => {
    const response = await lightAuthHandler({ event: event });
    return response;
  };
  return nuxtJsLightAuthHandler;
};

/**
 * CreateLightAuth is a function that creates the LightAuth components for Nuxt.js.
 * It takes a LightAuthConfig object as a parameter and returns a LightAuthNuxtJsComponents object.
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

  // lazy import the user adapter to avoid circular dependencies
  if (!config.userAdapter && typeof window === "undefined") {
    import("@light-auth/core/adapters").then((module) => {
      config.userAdapter = module.createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
    });
  }

  if (!config.sessionStore && typeof window === "undefined") {
    import("./nuxtjs-light-auth-session-store").then((module) => {
      config.sessionStore = module.nuxtJsLightAuthSessionStore;
    });
  }
  if (!config.router && typeof window === "undefined") {
    import("./nuxtjs-light-auth-router").then((module) => {
      config.router = module.nuxtJsLightAuthRouter;
    });
  }

  config.env = config.env || process.env;
  config.basePath = resolveBasePath(config.basePath, config.env);
  return {
    providers: config.providers,
    handlers: createNuxtJsLightAuthHandlerFunction(config),
    basePath: config.basePath,
    signIn: createNuxtJsSignIn(config),
    signOut: createNuxtJsSignOut(config),
    getSession: createNuxtJsLightAuthSessionFunction(config),
    getUser: createNuxtJsLightAuthUserFunction(config),
  };
}
