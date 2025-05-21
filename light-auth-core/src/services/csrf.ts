import * as sha2 from "@oslojs/crypto/sha2";
import * as encoding from "@oslojs/encoding";
import { LightAuthConfig, LightAuthCookie, LightAuthCsrfToken, LightAuthSession, LightAuthUser } from "../models";
import { internalFetch } from "./internal-fetch";

function createSha256(value: string): string {
  const codeChallengeBytes = sha2.sha256(new TextEncoder().encode(value));
  return encoding.encodeBase64urlNoPadding(codeChallengeBytes);
}

function generateRandomCsrf(): string {
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  return encoding.encodeBase64urlNoPadding(randomValues);
}

export async function getCsrfToken<Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>(args: {
  config: LightAuthConfig<Session, User>;
  [key: string]: unknown;
}) {
  const isServerSide = typeof window === "undefined";
  if (isServerSide) return;

  const { config } = args;
  // Get a csrf token from the server
  const endpoint = `${config.basePath}/csrf`;
  const csrfToken = await internalFetch<LightAuthCsrfToken>({ endpoint, method: "POST", ...args });

  if (!csrfToken) throw new Error("light-auth: Failed to get csrf token");

  // Check if the csrf token cookie, called light_auth_csrf_token exist
  const csrfTokenCookie = document.cookie.split("; ").find((row) => row.startsWith("light_auth_csrf_token="));
  if (csrfTokenCookie) window.document.cookie = `light_auth_csrf_token=; path=/; max-age=0;`;

  // Set the csrf token in the cookie store
  window.document.cookie = `light_auth_csrf_token=${csrfToken.csrfTokenHash}.${csrfToken.csrfToken}; path=/; secure=true}`;
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

export function createCsrfToken(secret: string): LightAuthCsrfToken {
  // New CSRF token
  const csrfToken = generateRandomCsrf();
  const csrfTokenHash = createSha256(`${csrfToken}${secret}`);
  return { csrfToken, csrfTokenHash };
}

export function validateCsrfToken(cookies: LightAuthCookie[], secret: string): boolean {
  const cookieValue = cookies.find((cookie) => cookie.name === "light_auth_csrf_token")?.value;
  const csrfTokenHash = cookieValue?.split(".")[0];
  const csrfToken = cookieValue?.split(".")[1];
  const expectedCsrfTokenHash = createSha256(`${csrfToken}${secret}`);

  if (!csrfTokenHash || csrfTokenHash !== expectedCsrfTokenHash) return false;
  return true;
}
