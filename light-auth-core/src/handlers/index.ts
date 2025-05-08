import { generateState, generateCodeVerifier, decodeIdToken } from "arctic";

import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseResponse } from "../models/light-auth-base";
import { buildSecret, checkConfig, getSessionExpirationMaxAge } from "../services/utils";
import { LightAuthSession, LightAuthUser } from "../models/light-auth-session";
import { decryptJwt, encryptJwt } from "../services/jwt";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";
import { getSessionHandler } from "./retrieve-session";
import { getUserHandler } from "./retrieve-user";
import { redirectToProviderLoginHandler } from "./redirect-to-provider";
import { logoutAndRevokeTokenHandler } from "./logout";
import { providerCallbackHandler } from "./provider-callback";

/**
 * Creates the HTTP handlers (get, set) function for LightAuth.
 * @param config The LightAuth configuration object.
 * @returns An HTTP handler function that processes requests and responses.
 */
export function createHttpHandlerFunction(config: LightAuthConfig) {
  const httpHandler = async (args?: { [key: string]: unknown }): Promise<BaseResponse> => {
    if (!config.router) throw new Error("light-auth: router is required");

    const url = await config.router.getUrl({ ...args });

    const reqUrl = new URL(url);

    const basePathSegments = config.basePath?.split("/").filter((segment) => segment !== "") || [];

    // Get the auth segments from the URL
    let pathname = reqUrl.pathname;

    let pathSegments = pathname.split("/").filter((segment) => segment !== "");
    // Remove all segments from basePathSegments, regardless of their index
    pathSegments = pathSegments.filter((segment) => !basePathSegments.includes(segment));

    // search callBack url
    const callbackUrl = reqUrl.searchParams.get("callbackUrl") ?? "/";

    let newResponse: BaseResponse | null = null;

    if (pathSegments.length < 1) throw new Error("light-auth: Not enough path segments found");

    const providerName = pathSegments.length > 1 ? pathSegments[1] : null;

    if (pathSegments[0] === "session") {
      newResponse = await getSessionHandler({ config, ...args });
    } else if (pathSegments[0] === "user") {
      newResponse = await getUserHandler({ config, id: pathSegments[1], ...args });
    } else if (pathSegments[0] === "login" && providerName) {
      newResponse = await redirectToProviderLoginHandler({ config, providerName, ...args });
    } else if (pathSegments[0] === "logout") {
      newResponse = await logoutAndRevokeTokenHandler({ config, revokeToken: false, callbackUrl, ...args });
    } else if (pathSegments[0] === "callback" && providerName) {
      newResponse = await providerCallbackHandler({ config, providerName, callbackUrl, ...args });
    }

    return newResponse;
  };
  return httpHandler;
}
