import { buildFullUrl, internalFetch } from "@light-auth/core";
import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createSigninClientFunction,
  createSignoutClientFunction,
  resolveBasePath,
} from "@light-auth/core/client";

import { type Ref } from "vue";

import { useRequestHeaders, useRequestURL, useAsyncData, useRequestEvent } from "#imports";

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
  const sessionFunction = async () => {
    try {
      const event = useRequestEvent();
      const headers = new Headers(useRequestHeaders());
      const url = useRequestURL();

      let urlEndpoint = `${config.basePath}/session`;

      if (url) {
        const incomingHeaders = new Headers();
        incomingHeaders.set("host", url.host);
        urlEndpoint = buildFullUrl({ url: urlEndpoint, incomingHeaders });
      }

      const session = await internalFetch<Session>({
        config,
        method: "POST",
        endpoint: urlEndpoint,
        event,
        headers,
      });
      return session ?? null;
    } catch (error) {
      console.error("Error fetching session:", error);
      throw error;
    }
  };

  return () => createCustomFetch<Session>("light-auth-session", sessionFunction);
};

export const createSetAuthSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  return async (session: Session) => {
    try {
      const event = useRequestEvent();
      const headers = new Headers(useRequestHeaders());
      const url = useRequestURL();

      let urlEndpoint = `${config.basePath}/set_session`;

      if (url) {
        const incomingHeaders = new Headers();
        incomingHeaders.set("host", url.host);
        urlEndpoint = buildFullUrl({ url: urlEndpoint, incomingHeaders });
      }

      const updatedSession = await internalFetch<Session>({
        config,
        method: "POST",
        endpoint: urlEndpoint,
        body: JSON.stringify(session),
        event,
        headers,
      });
      return updatedSession ?? null;
    } catch (error) {
      console.error("Error fetching session:", error);
      throw error;
    }
  };
};

export const createSetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  return async (user: User) => {
    try {
      const event = useRequestEvent();
      const headers = new Headers(useRequestHeaders());
      const url = useRequestURL();

      let urlEndpoint = `${config.basePath}/set_user`;

      if (url) {
        const incomingHeaders = new Headers();
        incomingHeaders.set("host", url.host);
        urlEndpoint = buildFullUrl({ url: urlEndpoint, incomingHeaders });
      }

      const updatedUser = await internalFetch<User>({
        config,
        method: "POST",
        endpoint: urlEndpoint,
        body: JSON.stringify(user),
        event,
        headers,
      });
      return updatedUser ?? null;
    } catch (error) {
      console.error("Error fetching session:", error);
      throw error;
    }
  };
};

const createGetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const userFunction = async (providerUserId?: string) => {
    const event = useRequestEvent();
    const headers = new Headers(useRequestHeaders());
    const url = useRequestURL();

    let userUrlEndpoint = providerUserId ? `${config.basePath}/user/${providerUserId}` : `${config.basePath}/user`;

    if (url) {
      const incomingHeaders = new Headers();
      incomingHeaders.set("host", url.host);
      userUrlEndpoint = buildFullUrl({ url: userUrlEndpoint, incomingHeaders });
    }

    // get the user from the user adapter
    const user = await internalFetch<User>({ config, method: "POST", endpoint: userUrlEndpoint, headers, event });
    return user ?? null;
  };

  return (providerUserId?: string) => createCustomFetch<User>(`light-auth-user-${providerUserId ?? "from-session"}`, () => userFunction(providerUserId));
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
    setSession: createSetAuthSession<Session, User>(config),
    setUser: createSetUser<Session, User>(config),
    useUser: createGetUser<Session, User>(config),
    signIn: createSignIn<Session, User>(config),
    signOut: createSignOut<Session, User>(config),
  };
}
