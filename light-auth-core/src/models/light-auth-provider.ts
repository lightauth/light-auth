import { type LightAuthTokens } from "./light-auth-tokens";

/**
 * User claims returned from credential verification.
 * These claims are used to populate the session and user objects.
 */
export interface LightAuthUserClaims {
  /**
   * Unique identifier for the user (subject).
   * This should be stable and unique across the application.
   */
  sub: string;

  /**
   * User's email address.
   */
  email: string;

  /**
   * User's display name.
   */
  name: string;

  /**
   * Optional URL to the user's profile picture.
   */
  picture?: string;

  /**
   * Any additional custom claims to include in the session/user.
   */
  [key: string]: unknown;
}

/**
 * LightAuthProvider is a discriminated union that supports both OAuth and Credentials authentication.
 * Use the 'type' field to distinguish between provider types.
 */
export type LightAuthProvider = LightAuthOAuthProvider | LightAuthCredentialsProvider;

/**
 * Context given to an OAuth provider getProfile function.
 */
export type LightAuthProfileContext = {
  /** Tokens returned by the provider, idTokenClaims is set for OpenID Connect providers */
  tokens: LightAuthTokens;
  /** Calls the provider userinfo endpoint with the access token */
  fetchUserInfo: () => Promise<Record<string, unknown>>;
  /** Calls any provider API with the access token (GET, JSON response) */
  fetchResource: (url: string) => Promise<unknown>;
  /** Parameters received on the callback (Apple sends the user name there on the first sign in) */
  callbackParameters: URLSearchParams;
};

/**
 * OAuth 2.0 / OpenID Connect provider.
 * Use createOidcProvider, createOAuth2Provider or one of the presets (createGoogleProvider, createMicrosoftEntraIdProvider, ...)
 */
export interface LightAuthOAuthProvider {
  /**
   * Discriminator for OAuth providers.
   */
  type: "oauth";

  /**
   * Event raised when getting OAuth2 tokens, either the access token / id token during login or the refresh token during automatic refresh.
   */
  onGetOAuth2Tokens?: (tokens: LightAuthTokens, metadata: { [key: string]: unknown }) => Promise<LightAuthTokens> | LightAuthTokens;

  /**
   * The name of the provider.
   * This is used to identify the provider in the light auth configuration and in the callback URL.
   * It should be unique for each provider.
   */
  providerName: string;

  /** OAuth client identifier */
  clientId: string;

  /** OAuth client secret, or a function returning it (e.g. the client secret JWT required by Apple) */
  clientSecret?: string | (() => string | Promise<string>);

  /**
   * How the client authenticates on the token and revocation endpoints.
   * Default is "client_secret_basic", or "none" when there is no client secret.
   */
  clientAuthentication?: "client_secret_basic" | "client_secret_post" | "none";

  /**
   * Callback URL registered at the provider.
   * Default is `${LIGHT_AUTH_URL}${basePath}/callback/${providerName}`, LIGHT_AUTH_URL being read from the environment.
   */
  redirectUri?: string;

  /**
   * OpenID Connect issuer.
   * Endpoints are discovered from `${issuer}/.well-known/openid-configuration` (unless authorizationEndpoint and tokenEndpoint are set)
   * and id_tokens are validated (signature, issuer, audience, expiration, nonce).
   */
  issuer?: string;

  /** Explicit endpoints, they take precedence over the discovered ones */
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
  /** RFC 7009 revocation endpoint, used on logout */
  revocationEndpoint?: string;
  /** JSON Web Key Set used to validate the id_token signature */
  jwksUri?: string;

  /**
   * Scopes requested to the provider.
   * The factories add the provider default scopes ("openid", "profile" and "email" for OpenID Connect providers).
   */
  scopes?: string[];

  /**
   * Use PKCE (S256), enabled by default.
   */
  pkce?: boolean;

  /**
   * How the provider sends the authorization response.
   * "form_post" (required by Apple when asking for the name or the email) posts it to the callback URL from the provider domain.
   */
  responseMode?: "query" | "form_post";

  /**
   * Optional search parameters for the provider.
   * These can be used to pass additional parameters to the authorization URL.
   */
  searchParams?: Map<string, string>;

  /**
   * Optional headers sent to the provider endpoints (token, userinfo, revocation and any API called by getProfile).
   */
  headers?: Map<string, string>;

  /**
   * Expected id_token issuer, for providers whose issuer depends on the signed-in tenant (Microsoft Entra ID multi-tenant).
   * The id_token signature is always verified against the provider JSON Web Key Set.
   */
  getIdTokenIssuer?: (claims: Record<string, unknown>) => string;

  /**
   * Maps the provider identity to the light auth claims (sub, email, name, picture).
   * Default: the validated id_token claims, or the userinfo endpoint response for OAuth 2.0 providers.
   */
  getProfile?: (context: LightAuthProfileContext) => Promise<LightAuthUserClaims> | LightAuthUserClaims;

  /**
   * Revokes a token for providers that do not implement RFC 7009 (e.g. GitHub).
   * When not set, the revocationEndpoint is used if any.
   */
  revokeToken?: (context: { token: string; tokenTypeHint: "access_token" | "refresh_token" }) => Promise<void>;
}

/**
 * Credentials-based authentication provider (email/password).
 * Handles traditional username/password authentication flows.
 */
export interface LightAuthCredentialsProvider {
  /**
   * Discriminator for credentials providers.
   */
  type: "credentials";

  /**
   * The name of the provider.
   * This is used to identify the provider in the light auth configuration.
   * It should be unique for each provider.
   */
  providerName: string;

  /**
   * Function to verify user credentials.
   * Should return user claims if authentication is successful, or null if credentials are invalid.
   *
   * @param email - The user's email address
   * @param password - The user's password (plaintext)
   * @param metadata - Additional context (request headers, IP, etc.)
   * @returns User claims if valid, null otherwise
   */
  verifyCredentials: (
    email: string,
    password: string,
    metadata?: { [key: string]: unknown }
  ) => Promise<LightAuthUserClaims | null> | LightAuthUserClaims | null;

  /**
   * Optional function to hash passwords.
   * If not provided, you must handle password hashing in verifyCredentials.
   *
   * @param password - The plaintext password to hash
   * @returns The hashed password
   */
  hashPassword?: (password: string) => Promise<string> | string;

  /**
   * Optional function to compare a plaintext password with a hash.
   * If not provided, you must handle comparison in verifyCredentials.
   *
   * @param password - The plaintext password
   * @param hash - The hashed password
   * @returns True if passwords match, false otherwise
   */
  comparePassword?: (password: string, hash: string) => Promise<boolean> | boolean;

  /**
   * Optional function to register a new user.
   * This allows the provider to handle user creation.
   *
   * @param email - The user's email address
   * @param password - The user's password (plaintext)
   * @param additionalData - Additional user data (name, etc.)
   * @returns User claims for the newly created user, or null if registration failed
   */
  registerUser?: (
    email: string,
    password: string,
    additionalData?: { name?: string; [key: string]: unknown }
  ) => Promise<LightAuthUserClaims | null> | LightAuthUserClaims | null;

  /**
   * Optional function to handle password reset requests.
   *
   * @param email - The user's email address
   * @returns True if reset email was sent, false otherwise
   */
  requestPasswordReset?: (email: string) => Promise<boolean> | boolean;

  /**
   * Optional function to reset password with a token.
   *
   * @param token - The password reset token
   * @param newPassword - The new password (plaintext)
   * @returns True if password was reset successfully, false otherwise
   */
  resetPassword?: (token: string, newPassword: string) => Promise<boolean> | boolean;
}
