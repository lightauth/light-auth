import { resolveBasePath } from "@light-auth/core/client";
import {
  createClientSessionFunction,
  createClientUserFunction,
  createClientSigninFunction,
  createClientSignoutFunction,
  LightAuthConfigClient,
} from "@light-auth/core/client";

function createNextJsSigninFunction(config: LightAuthConfigClient) {
  const signIn = createClientSigninFunction(config);
  return async (providerName?: string, callbackUrl: string = "/") => {
    return await signIn({ providerName, callbackUrl });
  };
}

function createNextJsSignoutFunction(config: LightAuthConfigClient) {
  const signOut = createClientSignoutFunction(config);
  return async (revokeToken?: boolean, callbackUrl: string = "/") => {
    return await signOut({ revokeToken, callbackUrl });
  };
}

function createNextJsGetSessionFunction(config: LightAuthConfigClient) {
  const getSession = createClientSessionFunction(config);
  return async () => {
    return await getSession();
  };
}

function createNextJsGetUserFunction(config: LightAuthConfigClient) {
  const getUser = createClientUserFunction(config);
  return async (userId?: string) => {
    return await getUser({ userId });
  };
}

export function CreateLightAuthClient(config?: LightAuthConfigClient) {
  config = config || {};
  config.basePath = resolveBasePath(config);
  config.env = config.env || process.env;
  return {
    basePath: config.basePath,
    signIn: createNextJsSigninFunction(config),
    signOut: createNextJsSignoutFunction(config),
    getSession: createNextJsGetSessionFunction(config),
    getUser: createNextJsGetUserFunction(config),
  };
}
