import { type LightAuthConfig, type BaseResponse, type LightAuthSession, type LightAuthUser } from "../models";
import { checkCsrfOrigin, createCsrfToken } from "../services/csrf";
import { createLightAuthRateLimiter } from "../services/light-auth-rate-limiter-factory";
import { logoutAndRevokeTokenHandler } from "./logout";
import { providerCallbackHandler } from "./provider-callback";
import { redirectToProviderLoginHandler } from "./redirect-to-provider";
import { getCsrfToken } from "./retrieve-csrf";
import { getSessionHandler } from "./retrieve-session";
import { getUserHandler } from "./retrieve-user";
import { setSessionHandler } from "./save-session";
import { setUserHandler } from "./save-user";

/**
 * Creates the HTTP handlers (get, set) function for LightAuth.
 * @param config The LightAuth configuration object.
 * @returns An HTTP handler function that processes requests and responses.
 */
export function createHttpHandlerFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
) {
  const httpHandler = async (args?: { [key: string]: unknown }): Promise<BaseResponse> => {
    if (!config.router) throw new Error("light-auth: router is required");
    if (!config.env) throw new Error("light-auth: env is required");
    if (!config.basePath) throw new Error("light-auth: basePath is required");
    const { env, basePath } = config;

    const req = await config.router.getRequest({ env, basePath, ...args });
    const headers = await config.router.getHeaders({ env, basePath, ...args });

    // check the origin of the request if cross-origin
    await checkCsrfOrigin(headers);

    const url = await config.router.getUrl({ env, basePath, ...args });
    const reqUrl = new URL(url);

    if (config.rateLimiter) {
      const limitResponse = await config.rateLimiter.onRateLimit({ env, url, headers, basePath, ...args });
      if (limitResponse) {
        // If the rate limiter returns a response, return it immediately
        return config.router.returnJson({
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

    const providerName = pathSegments.length > 1 ? pathSegments[1] : null;
    // get the callback URL if any
    const callbackUrlParam = reqUrl.searchParams.get("callbackUrl");
    const callbackUrl = callbackUrlParam ?? "/";

    // get the revoke token parameter if any
    const revokeTokenParam = reqUrl.searchParams.get("revokeToken");
    const revokeToken = revokeTokenParam != null ? revokeTokenParam.toLocaleLowerCase() === "true" || revokeTokenParam === "1" : false;

    let newResponse: BaseResponse | null = null;

    if (pathSegments[0] === "csrf" && req.method === "POST") {
      newResponse = await getCsrfToken({ config, ...args });
    } else if (pathSegments[0] === "session" && req.method === "POST") {
      newResponse = await getSessionHandler({ config, ...args });
    } else if (pathSegments[0] === "set_session" && req.method === "POST") {
      const session = await req.json();
      newResponse = await setSessionHandler({ config, ...args, session });
    } else if (pathSegments[0] === "user" && req.method === "POST") {
      newResponse = await getUserHandler({ config, userId: pathSegments[1], ...args });
    } else if (pathSegments[0] === "set_user" && req.method === "POST") {
      const user = await req.json();
      newResponse = await setUserHandler({ config, ...args, user });
    } else if (pathSegments[0] === "login" && providerName && req.method === "GET") {
      newResponse = await redirectToProviderLoginHandler({ config, providerName, callbackUrl, checkCsrf: true, ...args });
    } else if (pathSegments[0] === "logout" && req.method === "GET") {
      newResponse = await logoutAndRevokeTokenHandler({ config, revokeToken, checkCsrf: true, callbackUrl, ...args });
    } else if (pathSegments[0] === "callback" && providerName && req.method === "GET") {
      newResponse = await providerCallbackHandler({ config, providerName, ...args });
    }

    return newResponse;
  };
  return httpHandler;
}
