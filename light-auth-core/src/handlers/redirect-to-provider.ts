
import { generateState, generateCodeVerifier } from "arctic";

import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseResponse } from "../models/light-auth-base";
import { checkConfig } from "../services/utils";


/**
 * Redirects the user to the provider login page.
 */
export async function redirectToProviderLoginHandler(args: { config: LightAuthConfig; providerName?: string; [key: string]: unknown }): Promise<BaseResponse> {
  const { config, providerName } = args;
  const { provider, router, cookieStore, env } = checkConfig(config, providerName);

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

  // add additional headers
  if (provider.headers) {
    await router.setHeaders({ headers: provider.headers, ...args });
  }

  const stateCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_state`,
    path: "/",
    value: state,
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  const codeVerifierCookie: LightAuthCookie = {
    name: `${provider.providerName}_light_auth_code_verifier`,
    path: "/",
    value: codeVerifier,
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  };

  await cookieStore.setCookies({ cookies: [stateCookie, codeVerifierCookie], ...args });

  const redirect = await router.redirectTo({ url: url.toString(), ...args });

  return redirect;
}
