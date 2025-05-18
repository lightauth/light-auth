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
import { type EventHandlerRequest, type EventHandlerResponse, H3Event } from "h3";

// export type LightAuthAsyncDataRequestStatus = "idle" | "pending" | "success" | "error";

// export interface LightAuthAsyncSessionData {
//   session: LightAuthSession;
//   refresh: () => Promise<void>;
//   error: Error | null;
//   status: LightAuthAsyncDataRequestStatus;
// }

/**
 * createNuxtJsSignIn is a function that creates a sign-in function for Nuxt.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signIn = createSigninFunction(config);
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
  const signOut = createSignoutFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/", event?: H3Event<EventHandlerRequest>) => {
    await signOut({ revokeToken, callbackUrl, event });
  };
};

type NuxtJsLightAuthAsyncData<T> = globalThis.Ref<T | null | undefined> & {
  error: globalThis.Ref<Error | null>;
  refresh: () => Promise<void>;
};

/**
 * createNuxtJsLightAuthSessionFunction is a function that creates a light session function for Nuxt.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthSessionFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  return async () => {
    const { data, error, refresh } = await useFetch<Session>(`${config.basePath}/session`, { key: "light-auth-session" });
    return Object.assign(data, { error, refresh }) as NuxtJsLightAuthAsyncData<Session>;
  };
};

/**
 * createNuxtJsLightAuthUserFunction is a function that creates a light user function for Nuxt.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsLightAuthUserFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  // get the user from the server using the api endpoint, because
  // to get user we need the session that is stored in the cookie store and we may need to delete / update it

  return async () => {
    const { data: cachedSession } = useNuxtData<LightAuthSession>("light-auth-session");

    if (!cachedSession.value) {
      return Object.assign(ref(null), { error: ref(new Error("No session found")), refresh: async () => {} }) as NuxtJsLightAuthAsyncData<User>;
    }

    const { data, error, refresh } = await useFetch<LightAuthUser>(`${config.basePath}/user/${cachedSession.value.userId}`, {
      key: `light-auth-user${cachedSession.value.userId}`,
    });
    return Object.assign(data, { error, refresh }) as NuxtJsLightAuthAsyncData<User>;
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
