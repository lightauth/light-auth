import { logoutAndRevokeTokenHandler } from "./handlers/logout";
import { redirectToProviderLoginHandler } from "./handlers/redirect-to-provider";
import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "./models";
import { internalFetch } from "./services";

export function createSigninServerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { providerName?: string; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    // check if we are on the server side or client side
    const isServerSide = typeof window === "undefined";
    if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

    const { providerName, callbackUrl = "/" } = args;

    return await redirectToProviderLoginHandler({ config, providerName, callbackUrl: encodeURIComponent(callbackUrl), checkCsrf: false, ...args });
  };
}

export function createSignoutServerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { revokeToken?: boolean; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const isServerSide = typeof window === "undefined";
    if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

    const { revokeToken = true, callbackUrl = "/" } = args;

    return await logoutAndRevokeTokenHandler({ config, revokeToken, callbackUrl: encodeURIComponent(callbackUrl), checkCsrf: false, ...args });
  };
}

export function createFetchSessionServerFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (args?: { [key: string]: unknown }) => Promise<Session | null | undefined> {
  return async (args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

      // get the session from the server using the api endpoint
      const session = await internalFetch<Session>({ config, method: "POST", endpoint: `${config.basePath}/session`, ...args });

      return session;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createFetchUserServerFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (args?: { [key: string]: unknown }) => Promise<User | null | undefined> {
  return async (args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

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
