import { OAuth2Tokens } from "arctic";
import { type ArcticProvider } from "./artic-provider";

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
 * OAuth-based authentication provider using Arctic.
 * Supports standard OAuth 2.0 / OpenID Connect flows.
 */
export interface LightAuthOAuthProvider {
  /**
   * Discriminator for OAuth providers.
   */
  type: "oauth";

  /**
   * Event raised when getting OAuth2 tokens, either the access token / id token during login or the refresh token during automatic refresh.
   */
  onGetOAuth2Tokens?: (tokens: OAuth2Tokens, metadata: { [key: string]: unknown }) => Promise<OAuth2Tokens> | OAuth2Tokens;

  /**
   * The name of the provider.
   * This is used to identify the provider in the light auth configuration.
   * It should be unique for each provider.
   */
  providerName: string;

  /**
   * The arctic provider.
   * This is responsible for creating authorization URLs, validating authorization codes,
   * and exchanging authorization codes for access tokens.
   */
  arctic: ArcticProvider;

  /**
   * Optional scopes for the provider.
   * These are used to request specific permissions from the user.
   * The scopes are passed to the authorization URL and can be used to customize the authorization request.
   * You don't need to specify the default scopes for the provider.
   * The default scopes are automatically added to the authorization URL.
   * Default scopes are "openid", "profile", and "email".
   */
  scopes?: string[];

  /**
   * Optional search parameters for the provider.
   * These can be used to pass additional parameters to the authorization URL.
   */
  searchParams?: Map<string, string>;
  /**
   * Optional headers for the provider.
   * These can be used to pass additional headers to the authorization request.
   */
  headers?: Map<string, string>;
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
