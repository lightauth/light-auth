import {
  createClientSessionFunction,
  createClientSigninFunction,
  createClientSignoutFunction,
  createClientUserFunction,
  resolveBasePath,
  type LightAuthConfigClient,
} from "@light-auth/core/client";

export const createAstroGetSessionFunction = (config: LightAuthConfigClient) => {
  const sessionFunction = createClientSessionFunction(config);
  return async (req?: Request) => await sessionFunction({ req });
};

export const createAstroGetUserFunction = (config: LightAuthConfigClient) => {
  const userFunction = createClientUserFunction(config);
  return async (req?: Request) => await userFunction({ req });
};

export function createAstroSigninFunction(config: LightAuthConfigClient) {
  const signInFunction = createClientSigninFunction(config);
  return async (providerName: string, callbackUrl: string = "/") => await signInFunction({ providerName, callbackUrl });
}

export function createAstroSignoutFunction(config: LightAuthConfigClient) {
  const signOutFunction = createClientSignoutFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => await signOutFunction({ revokeToken, callbackUrl });
}

export function CreateLightAuthClient(config: LightAuthConfigClient) {
  config = config || {};
  config.basePath = resolveBasePath(config);
  config.env = config.env || import.meta.env;
  return {
    basePath: config.basePath,
    signIn: createAstroSigninFunction(config),
    signOut: createAstroSignoutFunction(config),
    getSession: createAstroGetSessionFunction(config),
    getUser: createAstroGetUserFunction(config),
  };
}
