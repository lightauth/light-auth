import { BaseResponse } from "../models/light-auth-base";
import { LightAuthConfig } from "../models/ligth-auth-config";

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
