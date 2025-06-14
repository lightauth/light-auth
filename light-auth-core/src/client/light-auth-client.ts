import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "../models";
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
      if (isServerSide) throw new Error("light-auth-client: fetchSession function should not be called on the server side");

      // get the session from the server using the api endpoint
      const session = await internalFetch<Session>({ config, method: "POST", endpoint: `${config.basePath}/session`, ...args });

      return session ?? null;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createSetSessionClientFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>): (session: Session, args?: { [key: string]: unknown }) => Promise<Session | null | undefined> {
  return async (session, args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (isServerSide) throw new Error("light-auth-client: setSession function should not be called on the server side");

      // get the session from the server using the api endpoint
      const updatedSession = await internalFetch<Session>({
        config,
        method: "POST",
        body: JSON.stringify(session),
        endpoint: `${config.basePath}/set_session`,
        ...args,
      });

      return updatedSession ?? null;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createFetchUserClientFunction<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(config: LightAuthConfig<Session, User>) {
  return async (args?: { providerUserId?: string; [key: string]: unknown }) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (isServerSide) throw new Error("light-auth-client: getUser function should not be called on the server side");

      const endpoint = args?.providerUserId ? `${config.basePath}/user/${args.providerUserId}` : `${config.basePath}/user`;

      // get the user from the user adapter
      const user = await internalFetch<User>({ config, method: "POST", endpoint, ...args });

      if (!user) return null;

      return user;
    } catch (error) {
      console.error("light-auth: Error in createLightAuthUserFunction:", error);
      return null;
    }
  };
}

export function createSetUserClientFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (user: User, args?: { [key: string]: unknown }) => Promise<User | null | undefined> {
  return async (user, args) => {
    try {
      const isServerSide = typeof window === "undefined";
      if (isServerSide) throw new Error("light-auth-client: setUser function should not be called on the server side");

      const updatedUser = await internalFetch<User>({
        config,
        method: "POST",
        body: JSON.stringify(user),
        endpoint: `${config.basePath}/set_user`,
        ...args,
      });

      return updatedUser ?? null;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}
