import { generateState, generateCodeVerifier } from "arctic";
import { type LightAuthConfig, type BaseResponse, type LightAuthCookie, type LightAuthSession, type LightAuthUser } from "../models";
import { buildSecret, checkConfig } from "../services/utils";
import { validateCsrfToken } from "../services";

/**
 * Redirects the user to the provider login page.
 */
export async function redirectToProviderLoginHandler<
  Session extends LightAuthSession = LightAuthSession,
  User extends LightAuthUser<Session> = LightAuthUser<Session>
>(args: {
  config: LightAuthConfig<Session, User>;
  providerName?: string;
  callbackUrl?: string;
  checkCsrf?: boolean;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, providerName, checkCsrf = true } = args;
  const { provider, router, env, basePath } = checkConfig(config, providerName);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  // Check if CSRF validation is required
  // it could be disable for direct call from a post action issued by the SSR framework
  if (checkCsrf) {
    const secret = buildSecret(env);
    const cookies = await router.getCookies({ env, basePath, ...args });
    const csrfIsValid = validateCsrfToken(cookies, secret);
    if (!csrfIsValid) throw new Error("Invalid CSRF token");
  }

  // Using Set to ensure unique scopes
  // and adding default scopes
  const scopeSet = new Set(provider.scopes ?? []);
  scopeSet.add("openid");
  scopeSet.add("profile");
  scopeSet.add("email");
  const scopes = Array.from(scopeSet);

  const url = provider.arctic.createAuthorizationURL(state, codeVerifier, scopes);

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

  // delete the csrf token cookie
  const csrfCookieDelete: LightAuthCookie = { name: "light_auth_csrf_token", value: "", maxAge: 0 };

  // set the cookies in the response
  const res = await router.setCookies({ env, basePath, cookies: [stateCookie, codeVerifierCookie, callbackUrlCookie, csrfCookieDelete], ...args });

  return await router.redirectTo({ env, basePath, url: url.toString(), headers: newHeaders, res, ...args });
}
