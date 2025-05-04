import { DEFAULT_SESSION_EXPIRATION } from "../constants";

/** get the max age from the environment variable or use the default value */
export function getSessionExpirationMaxAge() {
  let maxAge = process.env.LIGHT_AUTH_SESSION_EXPIRATION ? parseInt(process.env.LIGHT_AUTH_SESSION_EXPIRATION, 10) : DEFAULT_SESSION_EXPIRATION;
  if (isNaN(maxAge) || maxAge <= 0) maxAge = DEFAULT_SESSION_EXPIRATION; // Fallback if invalid
  return maxAge;
}
