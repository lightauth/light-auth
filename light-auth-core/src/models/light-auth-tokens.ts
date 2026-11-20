/**
 * Tokens returned by an OAuth 2.0 / OpenID Connect provider, as a plain serializable object.
 * Passed to the onGetOAuth2Tokens, onSessionSaving and onUserSaving hooks.
 */
export type LightAuthTokens = {
  /** OAuth 2.0 access token */
  accessToken: string;
  /** Token type, usually "bearer" */
  tokenType: string;
  /** Access token expiration date, when the provider returned an expires_in value */
  accessTokenExpiresAt?: Date;
  refreshToken?: string;
  /** Raw OpenID Connect id_token (JWT) */
  idToken?: string;
  /** id_token claims, only set once the id_token has been fully validated (signature, issuer, audience, expiration, nonce) */
  idTokenClaims?: Record<string, unknown>;
  /** Granted scopes, when returned by the provider */
  scopes?: string[];
  /** Raw token endpoint response, for provider specific fields */
  raw: Record<string, unknown>;
};
