import { OAuth2Tokens } from "arctic";
import { type ArcticProvider } from "./artic-provider";

/**
 * LightAuthProvider is an interface that defines the structure of a light auth provider.
 * It includes the provider name, arctic provider, optional scopes, search parameters, and headers.
 */
export interface LightAuthProvider {
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
