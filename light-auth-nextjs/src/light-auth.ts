import {
  createHttpHandlerFunction,
  createLightAuthFunction,
  createSigninFunction,
  createSignoutFunction,
  DEFAULT_BASE_PATH,
  LightAuthComponents,
  LightAuthConfig,
} from "@light-auth/core";
import { nextJsSessionStore } from "./store/session-store";
import { nextJsNavigatoreStore } from "./store/navigatore-store";
import { NextRequest, NextResponse } from "next/server";
import { createNextJsSignIn, createNextJsSignOut, LightAuthNextJsComponents } from "./wrappers/wrapper";

export function CreateLightAuth(config: LightAuthConfig): LightAuthNextJsComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.sessionStore = config.sessionStore ?? nextJsSessionStore;
  config.navigatoreStore = config.navigatoreStore ?? nextJsNavigatoreStore;

  return {
    providers: config.providers,
    handlers: {
      GET: createHttpHandlerFunction(config),
      POST: createHttpHandlerFunction(config),
    },
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createNextJsSignIn(config),
    signOut: createNextJsSignOut(config),
    lightAuth: createLightAuthFunction(config),
  };
}
