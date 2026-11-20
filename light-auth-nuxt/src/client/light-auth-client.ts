import {
  type LightAuthClientUser,
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createSigninClientFunction,
  createSignoutClientFunction,
  resolveBasePath,
} from "@light-auth/core/client";

import { type Ref } from "vue";

import { useAsyncData, useRequestFetch } from "#imports";

/** Represents the result of a Nuxt useFetch operation*/
export interface FetchResult<T> {
  data: Ref<T>;
  pending: Ref<boolean>;
  error: Ref<any | null>;
  status: Ref<AsyncDataRequestStatus>;
  refresh: () => Promise<void>;
  clear: () => void;
}

/**
 * createNuxtJsSignIn is a function that creates a sign-in function for Nuxt.js.
 * It takes the LightAuth createSigninFunction base function and returns a user friendly function by
 * removing the req and res parameters, that are not needed in the Nuxt.js context.
 */
const createSignIn = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
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
const createSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOut = createSignoutClientFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    await signOut({ revokeToken, callbackUrl });
  };
};

export type AsyncDataRequestStatus = "idle" | "pending" | "success" | "error";

export function createCustomFetch<T>(key: string, fetcher: () => Promise<T | null>): FetchResult<T | null> {
  const data = useAsyncData<T | null>(key, fetcher, {
    server: true,
    lazy: false,
    default: () => null,
    // @ts-ignore
    transform: (data) => data ?? false, // Ensure we return false instead of null to avoid hydration issues
    // avoid  WARN  [nuxt] useAsyncData must return a value (it should not be undefined) or the request may be duplicated on the client side.
  });

  // Map AsyncData to FetchResult<T>
  return data as FetchResult<T | null>;
}

export const createGetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  return () => {
    // useRequestFetch forwards the incoming cookies and, during SSR, calls the light auth route in-process:
    // no URL is ever built from the (spoofable) Host header
    const requestFetch = useRequestFetch();

    const sessionFunction = async () => {
      try {
        const session = await requestFetch<Session | null>(`${config.basePath}/session`, { method: "POST" });
        return session ?? null;
      } catch (error) {
        console.error("Error fetching session:", error);
        throw error;
      }
    };

    return createCustomFetch<Session>("light-auth-session", sessionFunction);
  };
};

const createGetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  return (providerUserId?: string) => {
    const requestFetch = useRequestFetch();

    const userFunction = async () => {
      const userUrlEndpoint = providerUserId ? `${config.basePath}/user/${providerUserId}` : `${config.basePath}/user`;

      // get the user from the user adapter (OAuth tokens are never sent to the browser)
      const user = await requestFetch<LightAuthClientUser<User> | null>(userUrlEndpoint, { method: "POST" });
      return user ?? null;
    };

    return createCustomFetch<LightAuthClientUser<User>>(`light-auth-user-${providerUserId ?? "from-session"}`, userFunction);
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
    useSession: createGetAuthSession<Session, User>(config),
    useUser: createGetUser<Session, User>(config),
    signIn: createSignIn<Session, User>(config),
    signOut: createSignOut<Session, User>(config),
  };
}
