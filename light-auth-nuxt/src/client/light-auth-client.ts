import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createSigninClientFunction,
  createSignoutClientFunction,
  resolveBasePath,
} from "@light-auth/core/client";

/**
 * createNuxtJsSignIn is a function that creates a sign-in function for Nuxt.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
export const createNuxtJsSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
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
export const createNuxtJsSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOut = createSignoutClientFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    await signOut({ revokeToken, callbackUrl });
  };
};

// @ts-ignore
type NuxtJsLightAuthAsyncData<T> = Ref<T | null | undefined> & {
  // @ts-ignore
  error: Ref<Error | null>;
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
    // @ts-ignore
    const { data, error, refresh } = await useFetch<Session>(`${config.basePath}/session`, { method: "post", key: "light-auth-session" });
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

  return async (userId?: string) => {
    let userIdToUse = userId;

    if (!userIdToUse) {
      // @ts-ignore
      const { data: cachedSession } = useNuxtData<LightAuthSession>("light-auth-session");

      if (!cachedSession.value) {
        // @ts-ignore
        return Object.assign(ref(null), { error: ref(new Error("No session found")), refresh: async () => {} }) as NuxtJsLightAuthAsyncData<User>;
      }
      userIdToUse = cachedSession.value.userId;
    }

    // @ts-ignore
    const { data, error, refresh } = await useFetch<LightAuthUser>(`${config.basePath}/user/${userIdToUse}`, {
      method: "post",
      key: `light-auth-user${userIdToUse}`,
    });

    if (error.value) {
      console.error("Error in createNuxtJsLightAuthUserFunction:", error.value);
    }
    return Object.assign(data, { error, refresh }) as NuxtJsLightAuthAsyncData<User>;
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
    getSession: createNuxtJsLightAuthSessionFunction(config),
    getUser: createNuxtJsLightAuthUserFunction(config),
    signIn: createNuxtJsSignIn(config),
    signOut: createNuxtJsSignOut(config),
  };
}
