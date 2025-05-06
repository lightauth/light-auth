import { DEFAULT_BASE_PATH, DEFAULT_SESSION_EXPIRATION, INTERNAL_SECRET_VALUE } from "../constants";
import { LightAuthConfig } from "../models/ligth-auth-config";

/** get the max age from the environment variable or use the default value */
export function getSessionExpirationMaxAge() {
  let maxAge = process.env.LIGHT_AUTH_SESSION_EXPIRATION ? parseInt(process.env.LIGHT_AUTH_SESSION_EXPIRATION, 10) : DEFAULT_SESSION_EXPIRATION;
  if (isNaN(maxAge) || maxAge <= 0) maxAge = DEFAULT_SESSION_EXPIRATION; // Fallback if invalid
  return maxAge;
}

/** Resolves the basePath, defaults to "/api/default" if not provided or falsy */
export function resolveBasePath(config: LightAuthConfig): string {
  const basePath = config.basePath;
  let resolvedBasePath = (basePath && basePath !== "") || config.env?.["LIGHT_AUTH_BASE_PATH"] || DEFAULT_BASE_PATH;

  // Ensure the base path is a string and does starts with "/"
  if (typeof resolvedBasePath !== "string") resolvedBasePath = DEFAULT_BASE_PATH;

  if (!resolvedBasePath.startsWith("/")) resolvedBasePath = `/${resolvedBasePath}`;

  // Ensure the base path does not end with "/"
  if (resolvedBasePath.endsWith("/")) resolvedBasePath = resolvedBasePath.slice(0, -1);

  // Ensure the base path does not contain double slashes
  if (resolvedBasePath.includes("//")) resolvedBasePath = resolvedBasePath.replace(/\/\//g, "/");

  return resolvedBasePath;
}

export function buildSecret(env?: { [key: string]: string | undefined }): string {
  if (!env) throw new Error("light-auth: config.env is required");
  if (!env.LIGHT_AUTH_SECRET_VALUE) throw new Error("light-auth: environment variable LIGHT_AUTH_SECRET_VALUE is required");

  const secret = (env.LIGHT_AUTH_SECRET_VALUE + INTERNAL_SECRET_VALUE).slice(0, 32);

  if (secret.length < 32) throw new Error("light-auth: secret must be at least 32 characters long");
  return secret;
}

export function buildFullUrl({ endpoint, req }: { endpoint?: string; req: Request }): URL {
  let url = endpoint ?? req.url;

  if (url.startsWith("http")) {
    return new URL(url);
  }

  const sanitizedEndpoint = url.startsWith("/") ? url : `/${url}`;
  const reqHost = req && req.headers && typeof req.headers.get === "function" && req.headers.get("host") != null ? req.headers.get("host") : null;
  const host: string = reqHost ?? "localhost:3000";

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
  return new URL(sanitizedEndpoint, `${protocol}://${sanitizedHost}`);
}
