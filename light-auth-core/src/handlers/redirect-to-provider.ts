import { type LightAuthConfig, type BaseResponse, type LightAuthCookie, type LightAuthSession, type LightAuthUser } from "../models";
import { buildSecret, checkConfig, sanitizeCallbackUrl } from "../services/utils";
import { CSRF_COOKIE_NAME, validateCsrfToken } from "../services";
import { createAuthorizationRequest } from "../services/oauth-client";

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
  csrfToken?: string | null;
  [key: string]: unknown;
}): Promise<BaseResponse> {
  const { config, providerName, checkCsrf = true } = args;

  const { provider, router, env, basePath } = checkConfig(config, providerName);

  // Check if CSRF validation is required
  // it could be disable for direct call from a post action issued by the SSR framework
  if (checkCsrf) {
    const secret = buildSecret(env);
    const cookies = await router.getCookies({ env, basePath, ...args });
    const csrfIsValid = await validateCsrfToken(cookies, secret, args.csrfToken);
    if (!csrfIsValid) throw new Error("Invalid CSRF token");
  }

  // Handle credentials provider differently - it doesn't use OAuth redirect flow
  if (provider.type === "credentials") {
    throw new Error("light-auth: Credentials provider login should be handled through POST to /credentials/login endpoint, not redirect-to-provider");
  }

  // OAuth provider flow: state, PKCE code verifier and OpenID Connect nonce are kept in short-lived cookies until the callback
  const { url, state, codeVerifier, nonce } = await createAuthorizationRequest(provider, { env, basePath });

  // a form_post response comes from the provider domain: the cookies must be sent with a cross-site POST
  const isFormPost = provider.responseMode === "form_post";
  const flowCookie = (name: string, value: string): LightAuthCookie => ({
    name: `${provider.providerName}_light_auth_${name}`,
    value,
    path: "/",
    httpOnly: true,
    secure: isFormPost || env["NODE_ENV"] === "production",
    sameSite: isFormPost ? "none" : "lax",
    maxAge: 60 * 10, // 10 minutes
  });

  const cookies: LightAuthCookie[] = [flowCookie("state", state), flowCookie("callback_url", sanitizeCallbackUrl(args.callbackUrl))];
  if (codeVerifier) cookies.push(flowCookie("code_verifier", codeVerifier));
  if (nonce) cookies.push(flowCookie("nonce", nonce));

  // delete the csrf token cookie (same path as when it was set, otherwise the browser keeps it)
  cookies.push({ name: CSRF_COOKIE_NAME, value: "", path: "/", maxAge: 0 });

  // set the cookies in the response
  const res = await router.setCookies({ env, basePath, cookies, ...args });

  return await router.redirectTo({ env, basePath, url: url.toString(), res, ...args });
}
