import { generateState, generateCodeVerifier, decodeIdToken } from "arctic";

import { LightAuthCookie } from "../models/light-auth-cookie";
import { LightAuthConfig } from "../models/ligth-auth-config";
import { BaseResponse } from "../models/light-auth-base";
import { buildSecret, checkConfig, getSessionExpirationMaxAge } from "../services/utils";
import { LightAuthSession, LightAuthUser } from "../models/light-auth-session";
import { decryptJwt, encryptJwt } from "../services/jwt";
import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";


/**
 * get session handler available on endpoint /${basePath}/session
 */
export async function getSessionHandler(args: { config: LightAuthConfig; [key: string]: unknown }): Promise<Response> {
  const { config } = args;
  const { cookieStore, router } = checkConfig(config);

  const cookieSession = (await cookieStore.getCookies({ search: DEFAULT_SESSION_COOKIE_NAME, ...args }))?.find(
    (cookie) => cookie.name === DEFAULT_SESSION_COOKIE_NAME
  );

  if (!cookieSession) return await router.writeJson({ data: null, ...args });

  let session: LightAuthSession | null = null;

  try {
    session = (await decryptJwt(cookieSession.value, buildSecret(config.env))) as LightAuthSession;
  } catch (error) {
    console.error("Failed to decrypt session cookie:", error);
    return await router.writeJson({ data: null, ...args });
  }

  if (!session || !session.id || !session.userId) {
    console.error("Unable to read session:", session);
    return await router.writeJson({ data: null, ...args });
  }

  // check if session is expired
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
    console.error("Session expired:", session.expiresAt);
    // delete the session cookie
    try {
      await cookieStore.deleteCookies({ search: DEFAULT_SESSION_COOKIE_NAME, ...args });
    } catch {}
    return await router.writeJson({ data: null, ...args });
  }

  // get the max age from the environment variable or use the default value
  let maxAge = getSessionExpirationMaxAge();
  const lowerLimitSessionRevalidationDate = new Date(Date.now() + (maxAge * 1000) / 2);
  const now = new Date();
  const expiresAt = new Date(session.expiresAt);

  if (now > lowerLimitSessionRevalidationDate && now < expiresAt) {
    // we can update the session expiration time
    session.expiresAt = new Date(Date.now() + maxAge * 1000);
    // update the session cookie
    const encryptedSession = await encryptJwt(session, buildSecret(config.env));
    cookieStore.setCookies({
      cookies: [
        {
          name: DEFAULT_SESSION_COOKIE_NAME,
          value: encryptedSession,
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: maxAge, // 30 days,
          path: "/",
        },
      ],
      ...args,
    });
  }

  return await router.writeJson({ data: session, args });
}
