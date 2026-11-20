import { logoutAndRevokeTokenHandler } from "./handlers/logout";
import { redirectToProviderLoginHandler } from "./handlers/redirect-to-provider";
import { getSessionDirect } from "./handlers/retrieve-session";
import { getUserDirect } from "./handlers/retrieve-user";
import { setSessionDirect } from "./handlers/save-session";
import { setUserDirect } from "./handlers/save-user";
import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "./models";

// Server functions run in-process: they never call the light auth HTTP endpoints, whose URL would be derived from the (spoofable) Host header.

export function createSigninServerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { providerName?: string; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    // check if we are on the server side or client side
    const isServerSide = typeof window === "undefined";
    if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

    const { providerName, callbackUrl = "/" } = args;

    return await redirectToProviderLoginHandler({ ...args, config, providerName, callbackUrl, checkCsrf: false });
  };
}

export function createSignoutServerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { revokeToken?: boolean; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const isServerSide = typeof window === "undefined";
    if (!isServerSide) throw new Error("light-auth: signout function should not be called on the client side. prefer to use the client version");

    const { revokeToken = true, callbackUrl = "/" } = args;

    return await logoutAndRevokeTokenHandler({ ...args, config, revokeToken, callbackUrl, checkCsrf: false });
  };
}

export function createFetchSessionServerFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (args?: { [key: string]: unknown }) => Promise<Session | null | undefined> {
  return async (args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (!isServerSide) throw new Error("light-auth: getAuthSession function should not be called on the client side. prefer to use the client version");

      return await getSessionDirect<Session, User>({ ...args, config });
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createSetSessionServerFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (args?: { session: Session; [key: string]: unknown }) => Promise<Session | null | undefined> {
  return async (args?: { session: Session; [key: string]: unknown }) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (!isServerSide) throw new Error("light-auth: setAuthSession function can only be called on the server side");
      if (!args?.session) return null;

      return await setSessionDirect<Session, User>({ ...args, config, session: args.session });
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createSetUserServerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { user: User; [key: string]: unknown }) => Promise<User | null | undefined> {
  return async (args?: { user: User; [key: string]: unknown }) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (!isServerSide) throw new Error("light-auth: setUser function can only be called on the server side");
      if (!args?.user) return null;

      return await setUserDirect<Session, User>({ ...args, config, user: args.user });
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}
export function createFetchUserServerFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>) {
  return async (args?: { providerUserId?: string; [key: string]: unknown }) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (!isServerSide) throw new Error("light-auth: getUser function should not be called on the client side. prefer to use the client version");

      return await getUserDirect<Session, User>({ ...args, config, providerUserId: args?.providerUserId });
    } catch (error) {
      console.error("light-auth: Error in createLightAuthUserFunction:", error);
      return null;
    }
  };
}
