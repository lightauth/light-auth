import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createFetchSessionClientFunction,
  createFetchUserClientFunction,
  createSetSessionClientFunction,
  createSetUserClientFunction,
  createSigninClientFunction,
  createSignoutClientFunction,
  resolveBasePath,
} from "@light-auth/core/client";

const createGetSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const sessionFunction = createFetchSessionClientFunction(config);
  return async () => await sessionFunction();
};

const createSetSession = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setSessionFunction = createSetSessionClientFunction(config);
  return async (session: Session) => await setSessionFunction(session, config);
};

const createGetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const userFunction = createFetchUserClientFunction(config);
  return async (userId?: string) => await userFunction({ userId });
};

const createSetUser = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const setUserFunction = createSetUserClientFunction(config);
  return async (user: User) => await setUserFunction(user, config);
};

const createSignin = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signInFunction = createSigninClientFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => await signInFunction({ providerName, callbackUrl });
};

const createSignOut = <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) => {
  const signOutFunction = createSignoutClientFunction(config);
  return async (revokeToken: boolean = false, callbackUrl: string = "/") => await signOutFunction({ revokeToken, callbackUrl });
};

type LightAuthConfigClient = Pick<LightAuthConfig<LightAuthSession, LightAuthUser<LightAuthSession>>, "basePath" | "env">;

export function CreateLightAuthClient<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfigClient | undefined = {}
) {
  config.env = config.env || process.env;
  config.basePath = resolveBasePath(config.basePath, config.env);

  return {
    basePath: config.basePath,
    getAuthSession: createGetSession<Session>(config),
    setAuthSession: createSetSession<Session>(config),
    getUser: createGetUser<Session, User>(config),
    setUser: createSetUser<Session, User>(config),
    signIn: createSignin(config),
    signOut: createSignOut(config),
  };
}
