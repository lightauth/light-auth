import { type LightAuthOAuthProvider } from "../models";
import { createOidcProvider, type LightAuthOAuthProviderOptions } from "./generic";

/**
 * Google (OpenID Connect).
 * Set accessType to "offline" to get a refresh token.
 */
export function createGoogleProvider(options: LightAuthOAuthProviderOptions & { accessType?: "online" | "offline" }): LightAuthOAuthProvider {
  const { accessType, ...rest } = options;

  const searchParams = new Map(rest.searchParams);
  if (accessType) searchParams.set("access_type", accessType);

  return createOidcProvider({ providerName: "google", issuer: "https://accounts.google.com", ...rest, searchParams });
}
