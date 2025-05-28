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

export const createAstroLightAuthSessionFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const sessionFunction = createFetchSessionClientFunction(config);
  return async () => await sessionFunction();
};

export const createAstroLightAuthUserFunction = <
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(
  config: LightAuthConfig<Session, User>
) => {
  const userFunction = createFetchUserClientFunction(config);
  return async (userId?: string) => await userFunction({ userId });
};

export function createAstroSigninFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signInFunction = createSigninClientFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => await signInFunction({ providerName, callbackUrl });
}

export function createAstroSignoutFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOutFunction = createSignoutClientFunction(config);
  return async (revokeToken: boolean = false, callbackUrl: string = "/") => await signOutFunction({ revokeToken, callbackUrl });
}

type LightAuthConfigClient = Pick<LightAuthConfig<LightAuthSession, LightAuthUser<LightAuthSession>>, "basePath" | "env">;

export function CreateLightAuthClient<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfigClient | undefined = {}
) {
  // @ts-ignore
  config.env = config.env || import.meta;
  config.basePath = resolveBasePath(config.basePath, config.env);

  return {
    basePath: config.basePath,
    getAuthSession: createAstroLightAuthSessionFunction(config),
    getUser: createAstroLightAuthUserFunction(config),
    signIn: createAstroSigninFunction(config),
    signOut: createAstroSignoutFunction(config),
  };
}
