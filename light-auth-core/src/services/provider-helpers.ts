import type { LightAuthOAuthProvider, LightAuthCredentialsProvider, LightAuthUserClaims } from "../models";
import type { ArcticProvider } from "../models";
import { OAuth2Tokens } from "arctic";

/**
 * Helper function to create an OAuth provider with explicit type.
 * This ensures backward compatibility and makes the type explicit.
 *
 * @param provider The OAuth provider configuration
 * @returns A typed OAuth provider
 */
export function createOAuthProvider(provider: Omit<LightAuthOAuthProvider, "type">): LightAuthOAuthProvider {
  return {
    type: "oauth",
    ...provider,
  };
}

/**
 * Helper function to create a credentials provider with explicit type.
 *
 * @param provider The credentials provider configuration
 * @returns A typed credentials provider
 */
export function createCredentialsProvider(provider: Omit<LightAuthCredentialsProvider, "type">): LightAuthCredentialsProvider {
  return {
    type: "credentials",
    ...provider,
  };
}

/**
 * Backward compatibility: Converts a legacy provider (without type field) to OAuth provider.
 * This allows existing code to continue working without changes.
 *
 * @param provider A provider that may or may not have the type field
 * @returns A properly typed provider
 */
export function ensureProviderType(
  provider: LightAuthOAuthProvider | LightAuthCredentialsProvider | (Omit<LightAuthOAuthProvider, "type"> & { arctic: ArcticProvider })
): LightAuthOAuthProvider | LightAuthCredentialsProvider {
  // If it already has a type, return as-is
  if ("type" in provider && (provider.type === "oauth" || provider.type === "credentials")) {
    return provider;
  }

  // If it has an arctic property, it's an OAuth provider (legacy format)
  if ("arctic" in provider) {
    return {
      type: "oauth",
      ...provider,
    } as LightAuthOAuthProvider;
  }

  // If it has verifyCredentials, it's a credentials provider (shouldn't happen but for safety)
  if ("verifyCredentials" in provider) {
    return provider as LightAuthCredentialsProvider;
  }

  throw new Error("light-auth: Invalid provider configuration. Provider must be either OAuth or Credentials type.");
}
