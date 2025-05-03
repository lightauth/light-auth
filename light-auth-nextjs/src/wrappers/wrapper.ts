import { createHttpHandlerFunction, createSigninFunction, createSignoutFunction, LightAuthConfig, LightAuthProvider, LightAuthSession } from "@light-auth/core";
import { NextRequest, NextResponse } from "next/server";

export interface LightAuthNextJsComponents {
  providers: LightAuthProvider[];
  handlers: {
    GET: (req: NextRequest, res: NextResponse, ...params: any[]) => Promise<NextResponse>;
    POST: (req: NextRequest, res: NextResponse, ...params: any[]) => Promise<NextResponse>;
  };
  signIn: (providerName?: string) => Promise<void>;
  signOut: (revokeToken?: boolean) => Promise<void>;
  basePath: string;
  lightAuth: () => Promise<LightAuthSession | null | undefined>;
}

export const createNextJsSignIn = (config: LightAuthConfig): ((providerName?: string) => Promise<void>) => {
  const signIn = createSigninFunction(config);
  return async (providerName?: string) => await signIn({ providerName });
};

export const createNextJsSignOut = (config: LightAuthConfig): ((revokeToken?: boolean) => Promise<void>) => {
  const signOut = createSignoutFunction(config);
  return async (revokeToken?: boolean) => await signOut({ revokeToken });
};
