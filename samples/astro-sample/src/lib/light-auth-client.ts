import { DEFAULT_BASE_PATH, type LightAuthConfig } from "@light-auth/core";
import { createAstroSigninFunction, createAstroSignoutFunction } from "./wrapper";

export function CreateLightAuthClient(config: { basePath: string }) {
  return {
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createAstroSigninFunction(config as LightAuthConfig),
    signOut: createAstroSignoutFunction(config as LightAuthConfig),
  };
}
