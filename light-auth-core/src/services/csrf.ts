import { base64url } from "jose";
import { type LightAuthConfig, type LightAuthCookie, type LightAuthCsrfToken, type LightAuthSession, type LightAuthUser } from "../models";
import { internalFetch } from "./internal-fetch";

/** Name of the cookie holding the signed CSRF token */
export const CSRF_COOKIE_NAME = "light_auth_csrf_token";
/** Header used by POST requests to send back the CSRF token (double-submit) */
export const CSRF_HEADER_NAME = "x-light-auth-csrf-token";
/** Query parameter used by GET navigations (login, logout) to send back the CSRF token (double-submit) */
export const CSRF_TOKEN_PARAM_NAME = "csrfToken";

const encoder = new TextEncoder();

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
}

async function signCsrfToken(csrfToken: string, secret: string): Promise<string> {
  // dedicated key, so the session encryption key is never used directly to sign CSRF tokens
  const csrfKey = await hmacSha256(encoder.encode(secret), encoder.encode("light-auth-csrf-token"));
  return base64url.encode(await hmacSha256(csrfKey, encoder.encode(csrfToken)));
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

function generateRandomCsrf(): string {
  return base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
}

/**
 * Client side: gets a new CSRF token from the server, stores it in the CSRF cookie and returns it,
 * so that the caller can send it back with the request (query parameter or header).
 */
export async function getCsrfToken<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  [key: string]: unknown;
}): Promise<string | undefined> {
  const isServerSide = typeof window === "undefined";
  if (isServerSide) return;

  const { config } = args;
  // Get a csrf token from the server
  const endpoint = `${config.basePath}/csrf`;
  const csrfToken = await internalFetch<LightAuthCsrfToken>({ endpoint, method: "POST", ...args });

  if (!csrfToken) throw new Error("light-auth: Failed to get csrf token");

  // Check if the csrf token cookie, called light_auth_csrf_token exist
  const csrfTokenCookie = document.cookie.split("; ").find((row) => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  if (csrfTokenCookie) window.document.cookie = `${CSRF_COOKIE_NAME}=; path=/; max-age=0;`;

  // Set the csrf token in the cookie store
  window.document.cookie = `${CSRF_COOKIE_NAME}=${csrfToken.csrfTokenHash}.${csrfToken.csrfToken}; path=/; secure; samesite=strict`;
  return csrfToken.csrfToken;
}

/**
 * Using the origin header to verify if the request is coming from a trusted source
 * See https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations#allowed-origins-advanced
 * TODO: Add support for reverse proxies or multi-layered backend architectures
 */
export async function checkCsrfOrigin(headers: Headers) {
  if (!headers || Array.from(headers.entries()).length === 0) return true;

  const origin = headers.get("origin");

  // if we have no origin or referer, we are not in a CORS request
  // and we are not in a CORS request, so we can skip the check
  if (!origin) return true;

  const host = headers.get("host") ?? headers.get("x-forwarded-host");

  // if we have no host, we are not in a CORS request
  // and we are not in a CORS request, so we can skip the check
  if (!host) throw new Error("light-auth: Missing host header for CSRF verification");

  // Allow for proxies or load balancers by checking x-forwarded-host and x-forwarded-proto
  // Parse host and origin to compare their hostnames
  try {
    const originUrl = new URL(origin);

    // Allow for multiple hosts in x-forwarded-host (comma separated)
    const hostList = host.split(",").map((h) => h.trim().toLowerCase());
    const originHost = originUrl.host.toLowerCase();

    // Allow if the origin host matches any of the hosts in the header
    if (!hostList.includes(originHost)) {
      throw new Error(`light-auth: CSRF verification failed. Origin (${originHost}) does not match host header (${hostList.join(", ")})`);
    }
  } catch (err) {
    throw new Error("light-auth: Invalid origin header for CSRF verification");
  }

  return true;
}

export async function createCsrfToken(secret: string): Promise<LightAuthCsrfToken> {
  // New CSRF token
  const csrfToken = generateRandomCsrf();
  const csrfTokenHash = await signCsrfToken(csrfToken, secret);
  return { csrfToken, csrfTokenHash };
}

/**
 * Double-submit validation: the signed token stored in the CSRF cookie must be authentic
 * and match the token sent back with the request (query parameter or header), which a cross-site attacker cannot read.
 */
export async function validateCsrfToken(cookies: LightAuthCookie[], secret: string, requestCsrfToken: string | null | undefined): Promise<boolean> {
  const cookieValue = cookies.find((cookie) => cookie.name === CSRF_COOKIE_NAME)?.value;
  if (!cookieValue || !requestCsrfToken) return false;

  const separatorIndex = cookieValue.indexOf(".");
  if (separatorIndex <= 0) return false;

  const csrfTokenHash = cookieValue.slice(0, separatorIndex);
  const csrfToken = cookieValue.slice(separatorIndex + 1);

  if (!csrfToken || !constantTimeEqual(csrfToken, requestCsrfToken)) return false;
  return constantTimeEqual(csrfTokenHash, await signCsrfToken(csrfToken, secret));
}
