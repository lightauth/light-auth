import { BaseResponse } from "../models";
import { resolveBasePath } from "../services/utils";

export { resolveBasePath };

export interface LightAuthConfigClient {
  basePath?: string;
  env?: { [key: string]: string | undefined };
}

export function createClientSigninFunction(config: LightAuthConfigClient): (args?: { providerName?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    if (typeof window === "undefined") throw new Error("light-auth [client]: signIn for client side is not available on the server side");

    const { providerName } = args;
    const basePath = resolveBasePath(config);

    window.location.href = `${basePath}/login/${providerName}`;
  };
}

export function createClientSignoutFunction(
  config: LightAuthConfigClient
): (args?: { revokeToken?: boolean; [key: string]: unknown }) => Promise<BaseResponse> {
  return async () => {
    if (typeof window === "undefined") throw new Error("light-auth [client]: signOut for client side is not available on the server side");
    const basePath = resolveBasePath(config);
    window.location.href = `${basePath}/logout`;
  };
}

export function createClientSessionFunction(config: LightAuthConfigClient): (args?: { [key: string]: unknown }) => Promise<BaseResponse> {
  return async () => {
    if (typeof window === "undefined") throw new Error("light-auth [client]: getSession for client side is not available on the server side");
    const basePath = resolveBasePath(config);
    const response = await fetch(`${basePath}/session`);
    return response.json();
  };
}

export function createClientUserFunction(config: LightAuthConfigClient): (args?: { userId?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    if (typeof window === "undefined") throw new Error("light-auth [client]: getUser for client side is not available on the server side");

    const { userId } = args;
    if (!userId) throw new Error("light-auth: userId is required");

    const basePath = resolveBasePath(config);
    const response = await fetch(`${basePath}/user/${userId}`);
    return response.json();
  };
}
