import {
  type LightAuthConfig,
  type LightAuthSession,
  type LightAuthUser,
  createFetchSessionClientFunction,
  createFetchUserClientFunction,
  createSigninClientFunction,
  createSignoutClientFunction,
  resolveBasePath,
} from "@light-auth/core/client";

export const createNextJsLightAuthSessionFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const sessionFunction = createFetchSessionClientFunction(config);
  return async () => await sessionFunction();
};

export const createNextJsLightAuthUserFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const userFunction = createFetchUserClientFunction(config);
  return async (userId?: string) => await userFunction({ userId });
};

export function createNextJsSigninFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signInFunction = createSigninClientFunction(config);
  return async (providerName: string, callbackUrl: string = "/") => await signInFunction({ providerName, callbackUrl });
}

export function createNextJsSignoutFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOutFunction = createSignoutClientFunction(config);
  return async (revokeToken: boolean = false, callbackUrl: string = "/") => await signOutFunction({ revokeToken, callbackUrl });
}

export function CreateLightAuthClient<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User> | undefined = {}
) {
  config.env = config.env || process.env;
  config.basePath = resolveBasePath(config.basePath, config.env);

  return {
    basePath: config.basePath,
    getSession: createNextJsLightAuthSessionFunction(config),
    getUser: createNextJsLightAuthUserFunction(config),
    signIn: createNextJsSigninFunction(config),
    signOut: createNextJsSignoutFunction(config),
  };
}
