import {
  createHttpHandlerFunction,
  createFetchSessionFunction,
  createFetchUserFunction,
  createSigninFunction,
  createSignoutFunction,
  type LightAuthConfig,
  type LightAuthProvider,
  type LightAuthSession,
  type LightAuthUser,
  resolveBasePath,
} from "@light-auth/core";
import { nuxtJsLightAuthRouter } from "./nuxtjs-light-auth-router";
import { nuxtJsLightAuthSessionStore } from "./nuxtjs-light-auth-session-store";
import { type EventHandlerRequest, type EventHandlerResponse, H3Event } from "h3";

// export type LightAuthAsyncDataRequestStatus = "idle" | "pending" | "success" | "error";

// export interface LightAuthAsyncSessionData {
//   session: LightAuthSession;
//   refresh: () => Promise<void>;
//   error: Error | null;
//   status: LightAuthAsyncDataRequestStatus;
// }

// export declare function useFetch2<
//   ResT = void,
//   ErrorT = Error,
//   ReqT extends Request = Request,
//   Method extends string = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD",
//   _ResT = ResT extends void ? FetchResult<ReqT, Method> : ResT,
//   DataT = _ResT,
//   PickKeys extends KeysOf<DataT> = KeysOf<DataT>,
//   DefaultT = DefaultAsyncDataValue
// >(
//   request: Ref<ReqT> | ReqT | (() => ReqT),
//   opts?: UseFetchOptions<_ResT, DataT, PickKeys, DefaultT, ReqT, Method>
// ): AsyncData<PickFrom<DataT, PickKeys> | DefaultT, ErrorT | DefaultAsyncDataErrorValue>;

/**
 * LightAuthNuxtJsComponents is an interface that defines the structure of the LightAuth components for Nuxt.js.
 * It includes the providers, base path, handlers for GET and POST requests, and functions for signing in,
 * signing out, and retrieving the light session and user.
 */
export interface LightAuthNuxtJsComponents {
  providers: LightAuthProvider[];
  basePath: string;
  handlers: (event: H3Event<EventHandlerRequest>) => EventHandlerResponse;
  signIn: (providerName?: string, callbackUrl?: string, event?: H3Event<EventHandlerRequest>) => Promise<EventHandlerResponse>;
  signOut: (revokeToken?: boolean, callbackUrl?: string, event?: H3Event<EventHandlerRequest>) => Promise<EventHandlerResponse>;
  getSession: () => Promise<(LightAuthSession & { refresh: () => Promise<void> }) | null | undefined>;
  getUser: () => Promise<{ user: globalThis.Ref<LightAuthUser | null, LightAuthUser | null>; refresh: () => Promise<void> }>;
}

/**
 * createNuxtJsSignIn is a function that creates a sign-in function for Nuxt.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsSignIn = (config: LightAuthConfig) => {
  const signIn = createSigninFunction(config);
  return async (providerName?: string, callbackUrl: string = "/", event?: H3Event<EventHandlerRequest>) => {
    return await signIn({ providerName, callbackUrl, event });
  };
};

/**
 * createNuxtJsSignOut is a function that creates a sign-out function for Nuxt.js.
 * It takes the LightAuth createSignoutFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsSignOut = (config: LightAuthConfig) => {
  const signOut = createSignoutFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/", event?: H3Event<EventHandlerRequest>) => {
    return await signOut({ revokeToken, callbackUrl, event });
  };
};

/**
 * createNuxtJsLightAuthSessionFunction is a function that creates a light session function for Nuxt.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthSessionFunction = (config: LightAuthConfig) => {
  return async () => {
    const { data, error, refresh } = await useFetch(`${config.basePath}/session`, { key: "session" });
    if (error.value) {
      console.error("Error trying to get session:", error.value);
      return null;
    }
    return { ...(data.value as LightAuthSession), refresh };
  };
};

/**
 * createNuxtJsLightAuthUserFunction is a function that creates a light user function for Nuxt.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthUserFunction = (config: LightAuthConfig) => {
  // get the user from the server using the api endpoint, because
  // to get user we need the session that is stored in the cookie store and we may need to delete / update it

  return async () => {
    const { data: cachedSession } = useNuxtData<LightAuthSession>("session");

    if (!cachedSession.value) {
      return { user: ref(null), refresh: () => Promise.resolve() };
    }

    const {
      data: user,
      error: userError,
      refresh,
    } = await useFetch<LightAuthUser>(`${config.basePath}/user/${cachedSession.value.userId}`, {
      key: `user${cachedSession.value.userId}`,
    });

    if (userError.value) {
      console.error("Error trying to get user:", userError.value);
      return { user: ref(null), refresh: () => Promise.resolve() };
    }
    return { user, refresh };
  };
};

type NuxtJsLightAuthHandlerFunction = (event: H3Event<EventHandlerRequest>) => EventHandlerResponse;

/**
 * createNuxtJsLightAuthHandlerFunction is a function that creates the light auth handler for Nuxt.js.
 * It takes the LightAuth createHttpHandlerFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthHandlerFunction = (config: LightAuthConfig): NuxtJsLightAuthHandlerFunction => {
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
export function CreateLightAuth(config: LightAuthConfig): LightAuthNuxtJsComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("light-auth: At least one provider is required");

  // lazy import the user adapter to avoid circular dependencies
  if (!config.userAdapter && typeof window === "undefined") {
    import("@light-auth/core/adapters").then((module) => {
      config.userAdapter = module.createLightAuthUserAdapter({ base: "./users_db", isEncrypted: false });
    });
  }
  config.router = config.router ?? nuxtJsLightAuthRouter;
  config.sessionStore = config.sessionStore ?? nuxtJsLightAuthSessionStore;
  config.basePath = resolveBasePath(config);
  config.env = config.env || process.env;
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
