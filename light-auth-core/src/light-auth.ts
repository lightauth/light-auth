import { OAuth2Tokens } from "arctic";
import { logoutAndRevokeToken, providerCallback, redirectToProviderLogin, sessionHandler } from "./services/handlers";
import { DEFAULT_BASE_PATH, DEFAULT_SESSION_COOKIE_NAME } from "./constants";
import { LightAuthConfig } from "./models/ligth-auth-config";
import { LightAuthSession, LightAuthUser } from "./models/light-auth-session";
import { LightAuthComponents } from "./models/light-auth-components";
import { BaseRequest, BaseResponse } from "./models/light-auth-base";
import { jwtDecrypt } from "jose";
import { decryptJwt } from "./services/jwt";

export function createSigninFunction(
  config: LightAuthConfig
): ({ req, res, providerName }: { req?: BaseRequest; res?: BaseResponse; providerName?: string }) => Promise<BaseResponse> {
  return async ({ req, res, providerName }) => {
    if (!config.navigatoreStore) throw new Error("navigatoreStore is required");

    const redirectResponse = await redirectToProviderLogin({ config, res, req, providerName });
    return redirectResponse;
  };
}

export function createSignoutFunction(
  config: LightAuthConfig
): ({ req, res, revokeToken }: { req?: BaseRequest; res?: BaseResponse; revokeToken?: boolean }) => Promise<BaseResponse> {
  return async ({ req, res, revokeToken }) => {
    if (!config.navigatoreStore) throw new Error("navigatoreStore is required");

    const redirectResponse = await logoutAndRevokeToken({ config, req, revokeToken });
    return redirectResponse;
  };
}

export function createLightAuthSessionFunction(
  config: LightAuthConfig
): (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthUser | null | undefined> {
  return async (args?: { req?: BaseRequest; res?: BaseResponse }) => {
    if (!config.navigatoreStore) throw new Error("navigatoreStore is required");
    if (!config.cookieStore) throw new Error("cookieStore is required");

    const cookiesSession = await config.cookieStore.getCookies({ req: args?.req, res: args?.res, search: DEFAULT_SESSION_COOKIE_NAME });
    if (cookiesSession == null || cookiesSession.length <= 0) return null;

    const session = (await decryptJwt(cookiesSession[0].value)) as LightAuthSession;
    return session;
  };
}

export function createLightAuthUserFunction(
  config: LightAuthConfig
): (args?: { req?: BaseRequest; res?: BaseResponse }) => Promise<LightAuthUser | null | undefined> {
  return async (args?: { req?: BaseRequest; res?: BaseResponse }) => {
    if (!config.userStore) throw new Error("userStore is required");
    if (!config.navigatoreStore) throw new Error("navigatoreStore is required");
    if (!config.cookieStore) throw new Error("cookieStore is required");

    const cookiesSession = await config.cookieStore.getCookies({ req: args?.req, res: args?.res, search: DEFAULT_SESSION_COOKIE_NAME });

    if (cookiesSession == null || cookiesSession.length <= 0) return null;
    const session = (await decryptJwt(cookiesSession[0].value)) as LightAuthSession;
    // get the user from the session store
    const user = await config.userStore.getUser({ req: args?.req, res: args?.res, id: session.id });

    return user;
  };
}

export function createHttpHandlerFunction(config: LightAuthConfig) {
  const httpHandler = async (req: BaseRequest, res: BaseResponse): Promise<BaseResponse> => {
    if (!req) throw new Error("request is required");
    if (!config.navigatoreStore) throw new Error("navigatoreStore is required");

    const url = await config.navigatoreStore.getUrl({ req });

    const reqUrl = new URL(url);

    const basePath = config.basePath || "/"; // Default base path for the handlers
    const basePathSegments = basePath.split("/").filter((segment) => segment !== "");

    // Get the auth segments from the URL
    let pathname = reqUrl.pathname;

    let pathSegments = pathname.split("/").filter((segment) => segment !== "");
    // Remove all segments from basePathSegments, regardless of their index
    pathSegments = pathSegments.filter((segment) => !basePathSegments.includes(segment));

    // search callBack url
    const callbackUrl = reqUrl.searchParams.get("callbackUrl") ?? "/";

    let newResponse: BaseResponse | null = null;

    if (pathSegments.length < 1) throw new Error("Not enough path segments found");

    const providerName = pathSegments.length > 1 ? pathSegments[1] : null;

    if (pathSegments[0] === "session") {
      newResponse = await sessionHandler({ req, res, config });
    } else if (pathSegments[0] === "login" && providerName) {
      newResponse = await redirectToProviderLogin({ req, res, config, providerName });
    } else if (pathSegments[0] === "logout") {
      newResponse = await logoutAndRevokeToken({ req, res, config, revokeToken: false, callbackUrl });
    } else if (pathSegments[0] === "callback" && providerName) {
      newResponse = await providerCallback({ req, res, config, providerName, callbackUrl });
    }

    return newResponse ?? res;
  };
  return httpHandler;
}

export function CreateLightAuth(config: LightAuthConfig): LightAuthComponents {
  if (!config.providers || config.providers.length === 0) throw new Error("At least one provider is required");

  config.userStore = config.userStore;
  config.navigatoreStore = config.navigatoreStore;
  config.cookieStore = config.cookieStore;

  return {
    providers: config.providers,
    handlers: {
      GET: createHttpHandlerFunction(config),
      POST: createHttpHandlerFunction(config),
    },
    basePath: config.basePath || DEFAULT_BASE_PATH, // Default base path for the handlers
    signIn: createSigninFunction(config),
    signOut: createSignoutFunction(config),
    getSession: createLightAuthSessionFunction(config),
    getUser: createLightAuthUserFunction(config),
  };
}
