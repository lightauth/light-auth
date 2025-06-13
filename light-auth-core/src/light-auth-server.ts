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
      return session ?? null;
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
      if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

      // get the session from the server using the api endpoint
      const newSession = await internalFetch<Session>({
        config,
        method: "POST",
        body: JSON.stringify(args?.session),
        endpoint: `${config.basePath}/set_session`,
        ...args,
      });
      return newSession ?? null;
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
      if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

      const newUser = await internalFetch<User>({
        config,
        method: "POST",
        body: JSON.stringify(args?.user),
        endpoint: `${config.basePath}/set_user`,
        ...args,
      });
      return newUser ?? null;
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
      if (!isServerSide) throw new Error("light-auth: signin function should not be called on the client side. prefer to use the client version");

      const endpoint = args?.providerUserId ? `${config.basePath}/user/${args.providerUserId}` : `${config.basePath}/user`;

      // get the user from the user adapter
      const user = await internalFetch<User>({ config, method: "POST", endpoint, ...args });
      return user ?? null;
    } catch (error) {
      console.error("light-auth: Error in createLightAuthUserFunction:", error);
      return null;
    }
  };
}
