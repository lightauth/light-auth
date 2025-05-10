import { logoutAndRevokeTokenHandler } from "./handlers/logout";
import { redirectToProviderLoginHandler } from "./handlers/redirect-to-provider";
import { LightAuthConfig, BaseResponse, LightAuthSession, LightAuthUser } from "./models";

/**
 * this function is used to make a server request to the light auth server
 * it's not meant to be used from the client side as we are transferring the session
 * in the request headers
 * @param param0
 * @returns
 */
async function serverRequest<T extends Record<string, string> | string | Blob>(args: {
  config: LightAuthConfig;
  endpoint: string;
  method?: "GET" | "POST";
  body?: any;
  [key: string]: unknown;
}): Promise<T | null | undefined> {
  const { config, body, method = "GET" } = args;
  const { router } = config;

  if (!router) throw new Error("light-auth: router is required");

  const bodyBytes = body ? new TextEncoder().encode(body.toString()) : undefined;

  // check we are on the server side
  if (typeof window !== "undefined") throw new Error("light-auth: serverRequest can only be used on the server side");

  // get all the headers from the request
  let requestHeaders: Headers = await router.getHeaders(args);

  // get the session from the session store
  let url = await router.getUrl(args);

  const request = bodyBytes
    ? new Request(url.toString(), { method: "POST", headers: requestHeaders, body: bodyBytes })
    : new Request(url.toString(), { method: method, headers: requestHeaders });

  let response: Response | null = null;
  try {
    response = await fetch(request);
  } catch (error) {
    console.error("Error:", error);
    throw new Error(`light-auth: Request failed with error ${error}`);
  }
  if (!response || !response.ok) {
    throw new Error(`light-auth: Request failed with status ${response?.status}`);
  }
  const contentType = response.headers.get("Content-Type");

  if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
    const formResponse = await response.text();
    const formData = new URLSearchParams(formResponse);
    const result: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      result[key] = value;
    }
    return result as T;
  }
  if (contentType && (contentType.includes("application/json") || contentType.includes("text/plain"))) {
    const jsonResponse = await response.json();
    return jsonResponse as T;
  }
  if (contentType && contentType.includes("application/octet-stream")) {
    const blobResponse = await response.blob();
    return blobResponse as T;
  }
  return null;
}

export function createServerSigninFunction(
  config: LightAuthConfig
): (args?: { providerName?: string; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { providerName, callbackUrl = "/" } = args;
    return await redirectToProviderLoginHandler({ config, providerName, callbackUrl: encodeURIComponent(callbackUrl), ...args });
  };
}

export function createServerSignoutFunction(
  config: LightAuthConfig
): (args?: { revokeToken?: boolean; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { revokeToken = true, callbackUrl = "/" } = args;
    return await logoutAndRevokeTokenHandler({ config, revokeToken, callbackUrl, ...args });
  };
}

export function createServerSessionFunction(config: LightAuthConfig): (args?: { [key: string]: unknown }) => Promise<LightAuthSession | null | undefined> {
  return async (args) => {
    try {
      // get the session from the server using the api endpoint, because
      // the session is stored in the cookie store and we may need to delete / update it
      const session = await serverRequest<LightAuthSession>({
        config,
        endpoint: `${config.basePath}/session`,
        ...args,
      });

      return session;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createServerUserFunction(config: LightAuthConfig): (args?: { [key: string]: unknown }) => Promise<LightAuthUser | null | undefined> {
  return async (args) => {
    if (!config.userAdapter) return null; // user adapter is not required
    if (!config.router) throw new Error("light-auth: router is required");
    if (!config.sessionStore) throw new Error("light-auth: sessionStore is required");

    try {
      // get the user from the server using the api endpoint, because
      // to get user we need the session that is stored in the cookie store and we may need to delete / update it
      const session = await serverRequest<LightAuthSession>({
        config,
        endpoint: `${config.basePath}/session`,
        ...args,
      });

      if (!session || !session.id) return null;
      // get the user from the user adapter      // get the user from the session store
      const user = await serverRequest<LightAuthUser>({
        config,
        endpoint: `${config.basePath}/user/${session.userId}`,
        ...args,
      });
      if (!user) return null;

      return user;
    } catch (error) {
      console.error("light-auth: Error in createLightAuthUserFunction:", error);
      return null;
    }
  };
}
