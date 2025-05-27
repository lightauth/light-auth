import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createSigninClientFunction,
  createSignoutClientFunction,
  resolveBasePath,
} from "@light-auth/core/client";

import { ref, type Ref } from "vue";

import { useFetch, useNuxtData, type AsyncDataRequestStatus } from "#imports";

/**
 * createNuxtJsSignIn is a function that creates a sign-in function for Nuxt.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
const createNuxtJsSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signIn = createSigninClientFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => {
    await signIn({ providerName, callbackUrl });
  };
};

/**
 * createNuxtJsSignOut is a function that creates a sign-out function for Nuxt.js.
 * It takes the LightAuth createSignoutFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
const createNuxtJsSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOut = createSignoutClientFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    await signOut({ revokeToken, callbackUrl });
  };
};

/** Represents the result of a Nuxt useFetch operation*/
export interface FetchResult<T> {
  data: Ref<T | null>;
  pending: Ref<boolean>;
  error: Ref<any | null>;
  status: Ref<AsyncDataRequestStatus>;
  refresh: () => Promise<void>;
  clear: () => void;
}

/**
 * createNuxtJsLightAuthSessionFunction is a function that creates a light session function for Nuxt.js.
 * It takes the LightAuth createLightAuthSessionFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
const createNuxtJsLightAuthSessionFunction = <Session extends LightAuthSession>(config: LightAuthConfig) => {
  return (): Promise<FetchResult<Session>> => {
    return useFetch(`${config.basePath}/session`, { method: "post", key: "light-auth-session", body: {} }) as Promise<FetchResult<Session>>;
  };
};

/**
 * createNuxtJsLightAuthUserFunction is a function that creates a light user function for Nuxt.js.
 * It takes the LightAuth createLightAuthUserFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
const createNuxtJsLightAuthUserFunction = <User extends LightAuthUser = LightAuthUser<LightAuthSession>>(config: LightAuthConfig) => {
  // get the user from the server using the api endpoint, because
  // to get user we need the session that is stored in the cookie store and we may need to delete / update it

  return (userId?: string): Promise<FetchResult<User>> => {
    let userIdToUse = userId;

    if (!userIdToUse) {
      const { data: cachedSession } = useNuxtData<LightAuthSession>("light-auth-session");

      if (!cachedSession.value?.userId) {
        return Promise.resolve<FetchResult<User>>({
          data: ref(null),
          pending: ref(false),
          error: ref(new Error("No session found")),
          refresh: async () => {},
          clear: () => {},
          status: ref("error"),
        } as FetchResult<User>);
      }
      userIdToUse = cachedSession.value.userId.toString();
    }

    return useFetch(`${config.basePath}/user/${userIdToUse}`, {
      method: "post",
      key: `light-auth-user${userIdToUse}`,
    }) as Promise<FetchResult<User>>;
  };
};

type LightAuthConfigClient = Pick<LightAuthConfig<LightAuthSession, LightAuthUser<LightAuthSession>>, "basePath" | "env">;

export function CreateLightAuthClient<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfigClient | undefined = {}
) {
  config.env = config.env || process.env;
  config.basePath = resolveBasePath(config.basePath, config.env);

  return {
    basePath: config.basePath,
    useSession: createNuxtJsLightAuthSessionFunction<Session>(config),
    useUser: createNuxtJsLightAuthUserFunction<User>(config),
    signIn: createNuxtJsSignIn(config),
    signOut: createNuxtJsSignOut(config),
  };
}
