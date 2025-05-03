import {
  Cookie,
  createHttpHandlerFunction,
  createLightAuthFunction,
  createSigninFunction,
  createSignoutFunction,
  DEFAULT_BASE_PATH,
  LightAuthConfig,
  LightAuthProvider,
  LightAuthSession,
} from "@light-auth/core";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { expressNavigatoreStore } from "./store/express-navigatore-store";
import { expressSessionStore } from "./store/express-session-store";

export interface LightAuthExpressComponents {
  providers: LightAuthProvider[];
  handlers: (req: ExpressRequest, res: ExpressResponse, ...params: any[]) => Promise<ExpressResponse>;
  signIn: ({ req, res, providerName }: { req?: ExpressRequest; res?: ExpressResponse; providerName: string }) => Promise<ExpressResponse>;
  signOut: ({ req, res }: { req?: ExpressRequest; res: ExpressResponse }) => Promise<ExpressResponse>;
  basePath: string;
  lightAuth: () => Promise<LightAuthSession | null | undefined>;
}

export function createExpressHttpHandlerFunction(config: LightAuthConfig): (req: ExpressRequest, res: ExpressResponse) => Promise<ExpressResponse> {
  return createHttpHandlerFunction(config);
}

export function CreateLightAuth(config: LightAuthConfig): LightAuthExpressComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.sessionStore = expressSessionStore;
  config.navigatoreStore = expressNavigatoreStore;

  return {
    providers: config.providers,
    handlers: createHttpHandlerFunction(config),
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createSigninFunction(config),
    signOut: createSignoutFunction(config),
    lightAuth: createLightAuthFunction(config),
  };
}
