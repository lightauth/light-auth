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
  return async () => await userFunction();
};

export function createAstroSigninFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signInFunction = createSigninClientFunction(config);
  return async (providerName: string) => await signInFunction({ providerName });
}

export function createAstroSignoutFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const signOutFunction = createSignoutClientFunction(config);
  return async () => await signOutFunction();
}

export function CreateLightAuthClient<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  // @ts-ignore
  config.env = config.env || import.meta;
  config.basePath = resolveBasePath(config.basePath, config.env);

  return {
    basePath: config.basePath,
    getSession: createAstroLightAuthSessionFunction(config),
    getUser: createAstroLightAuthUserFunction(config),
    signIn: createAstroSigninFunction(config),
    signOut: createAstroSignoutFunction(config),
  };
}
