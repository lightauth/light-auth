import { generateState, generateCodeVerifier } from "arctic";
import { LightAuthConfig, BaseResponse } from "../models";
import { checkConfig } from "../services/utils";
import * as cookieParser from "cookie";

/**
 * Redirects the user to the provider login page.
 */
export async function redirectToProviderLoginHandler(args: { config: LightAuthConfig; providerName?: string; [key: string]: unknown }): Promise<BaseResponse> {
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

  // add additional headers
  if (provider.headers) {
    const providersHeaders = new Headers();
    for (const [key, value] of provider.headers) {
      providersHeaders.append(key, value);
    }
    await router.setHeaders({ headers: providersHeaders, ...args });
  }

  const cookiesHeaders = new Headers();
  const stateCookie = cookieParser.serialize(`${provider.providerName}_light_auth_state`, state, {
    path: "/",
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  cookiesHeaders.append("Set-Cookie", stateCookie);
  const codeVerifierCookie = cookieParser.serialize(`${provider.providerName}_light_auth_code_verifier`, codeVerifier, {
    path: "/",
    httpOnly: true,
    secure: env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
  });
  cookiesHeaders.append("Set-Cookie", codeVerifierCookie);

  await router.setHeaders({ headers: cookiesHeaders, ...args });

  return await router.redirectTo({ url: url.toString(), ...args });
}
