import { generateState, generateCodeVerifier } from "arctic";
import { LightAuthConfig, BaseResponse, LightAuthCookie } from "../models";
import { checkConfig } from "../services/utils";
import * as cookieParser from "cookie";

/**
 * Redirects the user to the provider login page.
 */
export async function redirectToProviderLoginHandler(args: {
  config: LightAuthConfig;
  providerName?: string;
  callbackUrl?: string;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, providerName } = args;
  const { provider, router, env } = checkConfig(config, providerName);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Using Set to ensure unique scopes
  // and adding default scopes
  const scopeSet = new Set(provider.scopes ?? []);
  scopeSet.add("openid");
  scopeSet.add("profile");
  scopeSet.add("email");
  const scopes = Array.from(scopeSet);

  const url = provider.artic.createAuthorizationURL(state, codeVerifier, scopes);

  // add additional params to the url
  if (provider.searchParams) {
    for (const [key, value] of provider.searchParams) {
      url.searchParams.append(key, value);
    }
  }

  const newHeaders = new Headers();
  // add additional headers
  if (provider.headers) for (const [key, value] of provider.headers) newHeaders.append(key, value);

  const stateCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_state`,
    value: state,
    path: "/",
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  const codeVerifierCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_code_verifier`,
    value: codeVerifier,
    path: "/",
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  const callbackUrlCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_callback_url`,
    value: args.callbackUrl ? decodeURIComponent(args.callbackUrl) : "/",
    path: "/",
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  // set the cookies in the response
  const res = await router.setCookies({ cookies: [stateCookie, codeVerifierCookie, callbackUrlCookie], ...args });

  return await router.redirectTo({ url: url.toString(), headers: newHeaders, res, ...args });
}
