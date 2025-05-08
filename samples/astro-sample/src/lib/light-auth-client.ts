import { DEFAULT_BASE_PATH, type LightAuthConfig } from "@light-auth/core";
import { createAstroSigninFunction, createAstroSignoutFunction } from "./wrapper";
import { createGetSessionFunction, createGetUserFunction, createSigninFunction, createSignoutFunction } from "@light-auth/core/client";

export function CreateLightAuthClient(config: { basePath: string }) {
  return {
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createSigninFunction(config as LightAuthConfig),
    signOut: createSignoutFunction(config as LightAuthConfig),
    getSession: createGetSessionFunction(config as LightAuthConfig),
    getUser: createGetUserFunction(config as LightAuthConfig),
  };
}
