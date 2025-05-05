import { OAuth2Tokens } from "arctic";
import {
  logoutAndRevokeTokenHandler,
  providerCallbackHandler,
  redirectToProviderLoginHandler,
  getSessionHandler,
  getUserHandler,
  createHttpHandlerFunction,
} from "./services/handlers";
import { DEFAULT_BASE_PATH, DEFAULT_SESSION_COOKIE_NAME } from "./constants";
import { LightAuthConfig } from "./models/ligth-auth-config";
import { LightAuthSession, LightAuthUser } from "./models/light-auth-session";
import { LightAuthComponents } from "./models/light-auth-components";
import { BaseRequest, BaseResponse } from "./models/light-auth-base";
import * as cookieParser from "cookie";
import { resolveBasePath } from "./services/utils";

/**
 * this function is used to make a server request to the light auth server
 * it's not meant to be used from the client side as we are transferring the session
 * in the request headers
 * @param param0
 * @returns
 */
async function serverRequest<T extends Record<string, string> | string | Blob>({
  config,
  endpoint,
  body,
  req,
  res,
}: {
  config: LightAuthConfig;
  endpoint: string;
  body?: any;
  req?: BaseRequest;
  res?: BaseResponse;
}): Promise<T | null | undefined> {
  const bodyBytes = body ? new TextEncoder().encode(body.toString()) : undefined;

  // check we are on the server side
  if (typeof window !== "undefined") {
    throw new Error("serverRequest can only be used on the server side");
  }
  const cookies = await config.cookieStore?.getCookies({ req, res });

  // build the request
  const requestHeaders = new Headers();
  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("User-Agent", "light-auth");
  requestHeaders.set("Content-Type", "application/json");
  requestHeaders.set("Content-Length", bodyBytes ? bodyBytes.byteLength.toString() : "0");
  requestHeaders.set("Accept", "application/json");

  // add all cookies to the request
  if (cookies && cookies.length > 0) {
    for (const cookie of cookies) {
      const serialized = cookieParser.serialize(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        path: cookie.path,
        maxAge: cookie.maxAge,
        domain: cookie.domain,
      });
      requestHeaders.append("Cookie", serialized);
    }
  }

  let url: URL | null = null;
  if (endpoint.startsWith("http")) {
    url = new URL(endpoint);
  } else {
    const sanitizeEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

    const host: string = req && req.headers && typeof req.headers.get === "function" && req.headers.get("host") ? req.headers.get("host") : "localhost:3000";

    // Check if we are on https
    let protocol = "http";
    if (
      req &&
      req.headers &&
      typeof req.headers.get === "function" &&
      (req.headers.get("x-forwarded-proto") === "https" ||
        req.headers.get("x-forwarded-protocol") === "https" ||
        req.headers.get("x-forwarded-proto")?.split(",")[0] === "https")
    ) {
      protocol = "https";
    }

    const sanitizedHost = host.endsWith("/") ? host.slice(0, -1) : host;
    url = new URL(sanitizeEndpoint, `${protocol}://${sanitizedHost}`);
  }

  const request = bodyBytes
    ? new Request(url.toString(), { method: "POST", headers: requestHeaders, body: bodyBytes })
    : new Request(url.toString(), { method: "GET", headers: requestHeaders });

  let response: Response | null = null;
  try {
    response = await fetch(request);
  } catch (error) {
    console.error("Error:", error);
    throw new Error(`Request failed with error ${error}`);
  }
  if (!response || !response.ok) {
    throw new Error(`Request failed with status ${response?.status}`);
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
  if (contentType && contentType.includes("application/json")) {
    const jsonResponse = await response.json();
    return jsonResponse as T;
  }
  if (contentType && contentType.includes("text/plain")) {
    const textResponse = await response.text();
    return textResponse as T;
  }
  if (contentType && contentType.includes("application/octet-stream")) {
    const blobResponse = await response.blob();
    return blobResponse as T;
  }
  return null;
}

export function createSigninFunction(
  config: LightAuthConfig
): ({ req, res, providerName }: { req?: BaseRequest; res?: BaseResponse; providerName?: string }) => Promise<BaseResponse> {
  return async ({ req, res, providerName }) => {
    const redirectResponse = await redirectToProviderLoginHandler({ config, res, req, providerName });
    return redirectResponse;
  };
}

export function createSignoutFunction(
  config: LightAuthConfig
): ({ req, res, revokeToken }: { req?: BaseRequest; res?: BaseResponse; revokeToken?: boolean }) => Promise<BaseResponse> {
  return async ({ req, res, revokeToken }) => {
    const redirectResponse = await logoutAndRevokeTokenHandler({ config, req, revokeToken });
    return redirectResponse;
  };
}

export function createLightAuthSessionFunction(
  config: LightAuthConfig
): (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthSession | null | undefined> {
  return async (args?: { req?: BaseRequest; res?: BaseResponse }) => {
    if (!config.router) throw new Error("router is required");
    if (!config.cookieStore) throw new Error("cookieStore is required");

    try {
      // get the session from the server using the api endpoint, because
      // the session is stored in the cookie store and we may need to delete / update it
      const session = await serverRequest<LightAuthSession>({
        config,
        endpoint: `${config.basePath}/session`,
        req: args?.req,
        res: args?.res,
      });

      return session;
    } catch (error) {
      return null;
    }
  };
}

export function createLightAuthUserFunction(
  config: LightAuthConfig
): (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthUser | null | undefined> {
  return async (args?: { req?: BaseRequest; res?: BaseResponse }) => {
    if (!config.userAdapter) throw new Error("userAdapter is required");
    if (!config.router) throw new Error("router is required");
    if (!config.cookieStore) throw new Error("cookieStore is required");

    try {
      // get the user from the server using the api endpoint, because
      // to get user we need the session that is stored in the cookie store and we may need to delete / update it
      const session = await serverRequest<LightAuthSession>({
        config,
        endpoint: `${config.basePath}/session`,
        req: args?.req,
        res: args?.res,
      });

      if (!session || !session.id) return null;
      // get the user from the user adapter      // get the user from the session store
      const user = await serverRequest<LightAuthUser>({
        config,
        endpoint: `${config.basePath}/user/${session.id}`,
        req: args?.req,
        res: args?.res,
      });
      if (!user) return null;

      return user;
    } catch (error) {
      return null;
    }
  };
}

export function CreateLightAuth(config: LightAuthConfig): LightAuthComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userAdapter = config.userAdapter;
  config.router = config.router;
  config.cookieStore = config.cookieStore;
  config.basePath = resolveBasePath(config.basePath);

  return {
    providers: config.providers,
    handlers: {
      GET: createHttpHandlerFunction(config),
      POST: createHttpHandlerFunction(config),
    },
    basePath: config.basePath,
    signIn: createSigninFunction(config),
    signOut: createSignoutFunction(config),
    getSession: createLightAuthSessionFunction(config),
    getUser: createLightAuthUserFunction(config),
  };
}
