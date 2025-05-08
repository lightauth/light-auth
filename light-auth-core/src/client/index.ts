import { LightAuthConfig, BaseResponse } from "../models";

export function createSigninFunction(config: LightAuthConfig): (args?: { providerName?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { providerName } = args;
    if (typeof window === "undefined") {
      throw new Error("light-auth: signIn function for Astro is not available in the server side");
    }
    window.location.href = `${config.basePath}/login/${providerName}`;
  };
}

export function createSignoutFunction(config: LightAuthConfig): (args?: { revokeToken?: boolean; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    if (typeof window === "undefined") {
      throw new Error("light-auth: signOut function for Astro is not available in the server side");
    }
    window.location.href = `${config.basePath}/logout`;
  };
}

export function createGetSessionFunction(config: LightAuthConfig): (args?: { [key: string]: unknown }) => Promise<BaseResponse> {
  return async () => {
    if (typeof window === "undefined") {
      throw new Error("light-auth: getSession function for Astro is not available in the server side");
    }
    const response = await fetch(`${config.basePath}/session`);
    return response.json();
  };
}

export function createGetUserFunction(config: LightAuthConfig): (args?: { userId?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    if (typeof window === "undefined") {
      throw new Error("light-auth: getUser function for Astro is not available in the server side");
    }
    const { userId } = args;
    const response = await fetch(`${config.basePath}/user/${userId}`);
    return response.json();
  };
}
