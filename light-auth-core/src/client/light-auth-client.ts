import { LightAuthConfig, BaseResponse, LightAuthSession, LightAuthUser } from "../models";
import { getCsrfToken, internalFetch } from "../services";

export function createSigninClientFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { providerName?: string; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { providerName, callbackUrl = "/" } = args;

    // check if we are on the server side or client side
    const isServerSide = typeof window === "undefined";
    if (isServerSide) throw new Error("light-auth-client: signin function should not be called on the server side");

    // Get a csrf token from the server and set it in the cookie store
    await getCsrfToken({ config, ...args });
    window.location.href = `${config.basePath}/login/${providerName}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };
}

export function createSignoutClientFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { revokeToken?: boolean; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { revokeToken = true, callbackUrl = "/" } = args;

    const isServerSide = typeof window === "undefined";
    if (isServerSide) throw new Error("light-auth-client: signout function should not be called on the server side");

    // Get a csrf token from the server and set it in the cookie store
    await getCsrfToken({ config, ...args });
    window.location.href = `${config.basePath}/logout?revokeToken=${revokeToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };
}

export function createFetchSessionClientFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (args?: { [key: string]: unknown }) => Promise<Session | null | undefined> {
  return async (args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (isServerSide) throw new Error("light-auth-client: signout function should not be called on the server side");

      // get the session from the server using the api endpoint
      const session = await internalFetch<Session>({ config, method: "POST", endpoint: `${config.basePath}/session`, ...args });

      return session;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createFetchUserClientFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (args?: { [key: string]: unknown }) => Promise<User | null | undefined> {
  return async (args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (isServerSide) throw new Error("light-auth-client: getUser function should not be called on the server side");

      // get the user from the server using the api endpoint
      const session = await internalFetch<Session>({ config, method: "POST", endpoint: `${config.basePath}/session`, ...args });
      if (!session || !session.userId) return null;

      // get the user from the user adapter
      const user = await internalFetch<User>({ config, method: "POST", endpoint: `${config.basePath}/user/${session.userId}`, ...args });

      if (!user) return null;

      return user;
    } catch (error) {
      console.error("light-auth: Error in createLightAuthUserFunction:", error);
      return null;
    }
  };
}
