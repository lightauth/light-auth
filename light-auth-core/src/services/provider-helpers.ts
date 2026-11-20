import type { LightAuthOAuthProvider, LightAuthCredentialsProvider } from "../models";

/**
 * Helper function to create an OAuth provider with explicit type.
 * Low-level escape hatch: prefer createOidcProvider, createOAuth2Provider or a provider preset.
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
 * Adds the type discriminator to providers declared without it, and rejects the former arctic based configuration.
 *
 * @param provider A provider that may or may not have the type field
 * @returns A properly typed provider
 */
export function ensureProviderType(
  provider: LightAuthOAuthProvider | LightAuthCredentialsProvider | { [key: string]: unknown }
): LightAuthOAuthProvider | LightAuthCredentialsProvider {
  if ("arctic" in provider)
    throw new Error(
      `light-auth: provider "${String(provider.providerName)}" is configured with arctic, which is no longer supported. ` +
        "Use createGoogleProvider, createMicrosoftEntraIdProvider, createGitHubProvider, createOidcProvider... instead (see the migration guide in the README)."
    );

  // If it already has a type, return as-is
  if ("type" in provider && (provider.type === "oauth" || provider.type === "credentials")) {
    return provider as LightAuthOAuthProvider | LightAuthCredentialsProvider;
  }

  if ("verifyCredentials" in provider) return { ...provider, type: "credentials" } as LightAuthCredentialsProvider;
  if ("clientId" in provider) return { ...provider, type: "oauth" } as LightAuthOAuthProvider;

  throw new Error("light-auth: Invalid provider configuration. Provider must be either OAuth or Credentials type.");
}
