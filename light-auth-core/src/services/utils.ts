import { DEFAULT_BASE_PATH, DEFAULT_SESSION_EXPIRATION } from "../constants";

/** get the max age from the environment variable or use the default value */
export function getSessionExpirationMaxAge() {
  let maxAge = process.env.LIGHT_AUTH_SESSION_EXPIRATION ? parseInt(process.env.LIGHT_AUTH_SESSION_EXPIRATION, 10) : DEFAULT_SESSION_EXPIRATION;
  if (isNaN(maxAge) || maxAge <= 0) maxAge = DEFAULT_SESSION_EXPIRATION; // Fallback if invalid
  return maxAge;
}

/** Resolves the basePath, defaults to "/api/default" if not provided or falsy */
export function resolveBasePath(basePath?: string): string {
  let resolvedBasePath = (basePath && basePath !== "") || process.env.LIGHT_AUTH_BASE_PATH || DEFAULT_BASE_PATH;

  // Ensure the base path is a string and does starts with "/"
  if (typeof resolvedBasePath !== "string") resolvedBasePath = DEFAULT_BASE_PATH;

  if (!resolvedBasePath.startsWith("/")) resolvedBasePath = `/${resolvedBasePath}`;

  // Ensure the base path does not end with "/"
  if (resolvedBasePath.endsWith("/")) resolvedBasePath = resolvedBasePath.slice(0, -1);

  // Ensure the base path does not contain double slashes
  if (resolvedBasePath.includes("//")) resolvedBasePath = resolvedBasePath.replace(/\/\//g, "/");

  return resolvedBasePath;
}
