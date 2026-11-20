import { type LightAuthOAuthProvider } from "../models";
import { createOAuthProvider } from "../services/provider-helpers";

/** Options shared by the provider factories: everything can be overridden, only the client id is required */
export type LightAuthOAuthProviderOptions = Partial<Omit<LightAuthOAuthProvider, "type" | "clientId">> & { clientId: string };

/** Provider default scopes, extended with the configured ones */
export function mergeScopes(defaultScopes: string[], scopes?: string[]): string[] {
  return [...new Set([...defaultScopes, ...(scopes ?? [])])];
}

/**
 * Generic OpenID Connect provider: endpoints are discovered from the issuer and id_tokens are validated.
 * Default scopes: "openid", "profile", "email".
 */
export function createOidcProvider(options: LightAuthOAuthProviderOptions & { providerName: string; issuer: string }): LightAuthOAuthProvider {
  return createOAuthProvider({ ...options, scopes: mergeScopes(["openid", "profile", "email"], options.scopes) });
}

/**
 * Generic OAuth 2.0 provider (no OpenID Connect), with explicit endpoints.
 * The user identity is read with getProfile, or from the userinfo endpoint when it returns standard claims (sub, email, name, picture).
 */
export function createOAuth2Provider(
  options: LightAuthOAuthProviderOptions & { providerName: string; authorizationEndpoint: string; tokenEndpoint: string }
): LightAuthOAuthProvider {
  return createOAuthProvider({ ...options, scopes: options.scopes ?? [] });
}
