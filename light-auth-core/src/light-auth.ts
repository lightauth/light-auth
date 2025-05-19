import { logoutAndRevokeTokenHandler } from "./handlers/logout";
import { redirectToProviderLoginHandler } from "./handlers/redirect-to-provider";
import { LightAuthConfig, BaseResponse, LightAuthSession, LightAuthUser, LightAuthCsrfToken } from "./models";
import { checkConfig } from "./services";

/**
 * this function is used to make a request to the light auth server
 * it can be done from the server side or the client side
 *
 * it will use the router to get the url and the headers (if server side)
 */
async function internalPost<T extends Record<string, any> | string | Blob>(args: {
  config: LightAuthConfig<any, any>;
  endpoint: string;
  body?: any;
  [key: string]: unknown;
}): Promise<T | null | undefined> {
  const { config, body } = args;
  const { router } = config;

  // check if we are on the server side or client side
  // if we are on the server side, we need to use the router to get the url and headers
  // if we are on the client side, we can use the window object to get the url and headers
  const isServerSide = typeof window === "undefined";

  const bodyBytes = body ? new TextEncoder().encode(body.toString()) : undefined;

  // get all the headers from the request
  let requestHeaders: Headers | null = null;

  if (router && isServerSide) requestHeaders = await router.getHeaders(args);

  // get the full url from the router if available
  let url = args.endpoint;
  if (router && isServerSide) url = await router.getUrl(args);

  const request = bodyBytes
    ? new Request(url.toString(), { method: "POST", headers: requestHeaders ?? new Headers(), body: bodyBytes })
    : new Request(url.toString(), { method: "POST", headers: requestHeaders ?? new Headers() });

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

async function getCsrfToken<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  [key: string]: unknown;
}) {
  const isServerSide = typeof window === "undefined";
  if (isServerSide) return;

  const { config } = args;
  // Get a csrf token from the server
  const endpoint = `${config.basePath}/csrf`;
  const csrfToken = await internalPost<LightAuthCsrfToken>({ endpoint, ...args });

  if (!csrfToken) throw new Error("light-auth: Failed to get csrf token");

  // Check if the csrf token cookie, called light_auth_csrf_token exist
  const csrfTokenCookie = document.cookie.split("; ").find((row) => row.startsWith("light_auth_csrf_token="));
  if (csrfTokenCookie) window.document.cookie = `light_auth_csrf_token=; path=/; max-age=0;`;

  // Set the csrf token in the cookie store
  window.document.cookie = `light_auth_csrf_token=${csrfToken.csrfTokenHash}.${csrfToken.csrfToken}; path=/; secure=${
    config.env?.["NODE_ENV"] === "production"
  }`;
}

export function createSigninFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { providerName?: string; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { providerName, callbackUrl = "/" } = args;

    // check if we are on the server side or client side
    // if we are on the server side, we need to use the router to get the url and headers
    // if we are on the client side, we can use the window object to get the url and headers
    const isServerSide = typeof window === "undefined";
    if (isServerSide) {
      return await redirectToProviderLoginHandler({ config, providerName, callbackUrl: encodeURIComponent(callbackUrl), checkCsrf: false, ...args });
    } else {
      // Get a csrf token from the server and set it in the cookie store
      await getCsrfToken({ config, ...args });
      window.location.href = `${config.basePath}/login/${providerName}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
  };
}

export function createSignoutFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { revokeToken?: boolean; callbackUrl?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { revokeToken = true, callbackUrl = "/" } = args;

    // check if we are on the server side or client side
    // if we are on the server side, we need to use the router to get the url and headers
    // if we are on the client side, we can use the window object to get the url and headers
    const isServerSide = typeof window === "undefined";
    if (isServerSide)
      return await logoutAndRevokeTokenHandler({ config, revokeToken, callbackUrl: encodeURIComponent(callbackUrl), checkCsrf: false, ...args });
    else {
      // Get a csrf token from the server and set it in the cookie store
      await getCsrfToken({ config, ...args });
      window.location.href = `${config.basePath}/logout?revokeToken=${revokeToken}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
  };
}

export function createFetchSessionFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { [key: string]: unknown }) => Promise<Session | null | undefined> {
  return async (args) => {
    try {
      // get the session from the server using the api endpoint
      const session = await internalPost<Session>({ config, endpoint: `${config.basePath}/session`, ...args });

      return session;
    } catch (error) {
      console.error("Error:", error);
      return null;
    }
  };
}

export function createFetchUserFunction<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(
  config: LightAuthConfig<Session, User>
): (args?: { [key: string]: unknown }) => Promise<User | null | undefined> {
  return async (args) => {
    try {
      // get the user from the server using the api endpoint
      const session = await internalPost<Session>({ config, endpoint: `${config.basePath}/session`, ...args });
      if (!session || !session.userId) return null;

      // get the user from the user adapter
      const user = await internalPost<User>({ config, endpoint: `${config.basePath}/user/${session.userId}`, ...args });

      if (!user) return null;

      return user;
    } catch (error) {
      console.error("light-auth: Error in createLightAuthUserFunction:", error);
      return null;
    }
  };
}
