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
import { createLightAuthRouter } from "./light-auth-router";
import { createLightAuthCookieStore } from "./stores/light-auth-cookie-store";

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
  body?: any;
  [key: string]: unknown;
}): Promise<T | null | undefined> {
  const { config, endpoint, body } = args;
  const { cookieStore, router } = config;

  if (!cookieStore) throw new Error("light-auth: cookieStore is required");
  if (!router) throw new Error("light-auth: router is required");

  const bodyBytes = body ? new TextEncoder().encode(body.toString()) : undefined;

  // check we are on the server side
  if (typeof window !== "undefined") {
    throw new Error("light-auth: serverRequest can only be used on the server side");
  }

  const cookies = await cookieStore?.getCookies(args);

  // build the request
  const requestHeaders = new Headers();
  requestHeaders.set("Accept", "application/json");
  requestHeaders.set("User-Agent", "light-auth");
  requestHeaders.set("Content-Type", "application/json");
  requestHeaders.set("Content-Length", bodyBytes ? bodyBytes.byteLength.toString() : "0");

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

  let url = await router.getUrl(args);

  const request = bodyBytes
    ? new Request(url.toString(), { method: "POST", headers: requestHeaders, body: bodyBytes })
    : new Request(url.toString(), { method: "GET", headers: requestHeaders });

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

export function createSigninFunction(config: LightAuthConfig): (args?: { providerName?: string; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const { providerName } = args;
    const redirectResponse = await redirectToProviderLoginHandler({ config, providerName, ...args });
    return redirectResponse;
  };
}

export function createSignoutFunction(config: LightAuthConfig): (args?: { revokeToken?: boolean; [key: string]: unknown }) => Promise<BaseResponse> {
  return async (args = {}) => {
    const redirectResponse = await logoutAndRevokeTokenHandler({ config, ...args });
    return redirectResponse;
  };
}

export function createLightAuthSessionFunction(config: LightAuthConfig): (args?: { [key: string]: unknown }) => Promise<LightAuthSession | null | undefined> {
  return async (args) => {
    if (!config.router) throw new Error("light-auth router is required");
    if (!config.cookieStore) throw new Error("light-auth cookieStore is required");

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

export function createLightAuthUserFunction(config: LightAuthConfig): (args?: { [key: string]: unknown }) => Promise<LightAuthUser | null | undefined> {
  return async (args) => {
    if (!config.userAdapter) return null; // user adapter is not required
    if (!config.router) throw new Error("light-auth: router is required");
    if (!config.cookieStore) throw new Error("light-auth: cookieStore is required");

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
        endpoint: `${config.basePath}/user/${session.id}`,
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

