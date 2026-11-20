import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "../models";
import { checkCsrfOrigin, CSRF_HEADER_NAME, CSRF_TOKEN_PARAM_NAME, validateCsrfToken } from "../services/csrf";
import { buildSecret, sanitizeCallbackUrl } from "../services/utils";
import { logoutAndRevokeTokenHandler } from "./logout";
import { providerCallbackHandler } from "./provider-callback";
import { redirectToProviderLoginHandler } from "./redirect-to-provider";
import { getCsrfToken } from "./retrieve-csrf";
import { getSessionHandler } from "./retrieve-session";
import { getUserHandler, getUserDirect } from "./retrieve-user";
export { getUserDirect };
import { credentialsLoginHandler } from "./credentials-login";
import { credentialsRegisterHandler } from "./credentials-register";
import { credentialsResetPasswordRequestHandler, credentialsResetPasswordConfirmHandler } from "./credentials-reset-password";

/**
 * Creates the HTTP handlers (get, set) function for LightAuth.
 * Sessions and users can only be written by trusted server-side code (setSessionDirect / setUserDirect), never through HTTP.
 * @param config The LightAuth configuration object.
 * @returns An HTTP handler function that processes requests and responses.
 */
export function createHttpHandlerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const httpHandler = async (args?: { [key: string]: unknown }): Promise<BaseResponse> => {
    const router = config.router;
    if (!router) throw new Error("light-auth: router is required");
    if (!config.env) throw new Error("light-auth: env is required");
    if (!config.basePath) throw new Error("light-auth: basePath is required");
    const { env, basePath } = config;

    const req = await router.getRequest({ env, basePath, ...args });
    const headers = await router.getHeaders({ env, basePath, ...args });

    const url = await router.getUrl({ env, basePath, ...args });
    const reqUrl = new URL(url);

    if (config.rateLimiter) {
      const limitResponse = await config.rateLimiter.onRateLimit({ env, url, headers, basePath, ...args });
      if (limitResponse) {
        // If the rate limiter returns a response, return it immediately
        return router.returnJson({
          env,
          basePath,
          ...limitResponse,
          ...args,
        });
      }
    }
    // If the rate limiter does not return a response, continue processing the request

    // Get the auth segments from the URL
    let pathname = reqUrl.pathname;
    let pathSegments = pathname.split("/").filter((segment) => segment !== "");

    // Remove all segments from basePathSegments, regardless of their index
    const basePathSegments = config.basePath?.split("/").filter((segment) => segment !== "") || [];
    pathSegments = pathSegments.filter((segment) => !basePathSegments.includes(segment));

    if (pathSegments.length < 1) throw new Error("light-auth: Not enough path segments found");

    // check the origin of cross-origin requests, except on the OAuth callback: form_post responses are posted from the provider domain,
    // and the callback is protected by the state, PKCE and nonce checks
    if (pathSegments[0] !== "callback") await checkCsrfOrigin(headers);

    const providerName = pathSegments.length > 1 ? pathSegments[1] : null;
    // get the callback URL if any, restricted to a same-origin path to prevent open redirects
    const callbackUrl = sanitizeCallbackUrl(reqUrl.searchParams.get("callbackUrl"), reqUrl.origin);

    // CSRF token sent back by the client with GET navigations (login, logout)
    const csrfToken = reqUrl.searchParams.get(CSRF_TOKEN_PARAM_NAME);

    // get the revoke token parameter if any
    const revokeTokenParam = reqUrl.searchParams.get("revokeToken");
    const revokeToken = revokeTokenParam != null ? revokeTokenParam.toLocaleLowerCase() === "true" || revokeTokenParam === "1" : false;

    // POST endpoints send the CSRF token back in a header (double-submit)
    const assertCsrfHeader = async () => {
      const cookies = await router.getCookies({ env, basePath, ...args });
      const csrfIsValid = await validateCsrfToken(cookies, buildSecret(env), headers.get(CSRF_HEADER_NAME));
      if (!csrfIsValid) throw new Error("Invalid CSRF token");
    };

    let newResponse: BaseResponse | null = null;

    if (pathSegments[0] === "csrf" && req.method === "POST") {
      newResponse = await getCsrfToken({ config, ...args });
    } else if (pathSegments[0] === "session" && req.method === "POST") {
      newResponse = await getSessionHandler({ config, ...args });
    } else if (pathSegments[0] === "user" && req.method === "POST") {
      newResponse = await getUserHandler({ config, providerUserId: pathSegments[1], ...args });
    } else if (pathSegments[0] === "login" && providerName && req.method === "GET") {
      newResponse = await redirectToProviderLoginHandler({ ...args, config, providerName, callbackUrl, checkCsrf: true, csrfToken });
    } else if (pathSegments[0] === "logout" && req.method === "GET") {
      newResponse = await logoutAndRevokeTokenHandler({ ...args, config, revokeToken, checkCsrf: true, callbackUrl, csrfToken });
    } else if (pathSegments[0] === "callback" && providerName && (req.method === "GET" || req.method === "POST")) {
      // form_post authorization responses (Apple) are posted as application/x-www-form-urlencoded
      const callbackParameters = req.method === "POST" ? new URLSearchParams(await req.text()) : reqUrl.searchParams;
      newResponse = await providerCallbackHandler({ ...args, config, providerName, callbackParameters });
    } else if (pathSegments[0] === "credentials" && pathSegments[1] === "login" && req.method === "POST") {
      await assertCsrfHeader();
      const body = await req.json();
      newResponse = await credentialsLoginHandler({
        config,
        email: body.email,
        password: body.password,
        callbackUrl: sanitizeCallbackUrl(body.callbackUrl, reqUrl.origin),
        ...args,
      });
    } else if (pathSegments[0] === "credentials" && pathSegments[1] === "register" && req.method === "POST") {
      await assertCsrfHeader();
      const body = await req.json();
      newResponse = await credentialsRegisterHandler({
        config,
        email: body.email,
        password: body.password,
        name: body.name,
        autoLogin: body.autoLogin,
        additionalData: body.additionalData,
        ...args,
      });
    } else if (pathSegments[0] === "credentials" && pathSegments[1] === "reset-password" && pathSegments[2] === "request" && req.method === "POST") {
      await assertCsrfHeader();
      const body = await req.json();
      newResponse = await credentialsResetPasswordRequestHandler({ config, email: body.email, ...args });
    } else if (pathSegments[0] === "credentials" && pathSegments[1] === "reset-password" && pathSegments[2] === "confirm" && req.method === "POST") {
      await assertCsrfHeader();
      const body = await req.json();
      newResponse = await credentialsResetPasswordConfirmHandler({ config, token: body.token, newPassword: body.newPassword, ...args });
    }

    return newResponse;
  };
  return httpHandler;
}

// Export individual handlers for advanced usage
export * from "./logout";
export * from "./provider-callback";
export * from "./redirect-to-provider";
export { getCsrfToken as retrieveCsrfTokenHandler } from "./retrieve-csrf"; // Renamed to avoid conflict with services/csrf
export * from "./retrieve-session";
export * from "./retrieve-user";
export * from "./save-session";
export * from "./save-user";
export * from "./credentials-login";
export * from "./credentials-register";
export * from "./credentials-reset-password";
