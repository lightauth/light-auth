import { OAuth2Tokens } from "arctic";

export interface ArcticProvider {
  createAuthorizationURL(state: string, codeVerifier: string, scopes: string[]): URL;
  validateAuthorizationCode(code: string, codeVerifier: string): Promise<OAuth2Tokens>;
  refreshAccessToken?(refreshToken: string, scopes?: string[]): Promise<OAuth2Tokens>;
  revokeToken?(token: string): Promise<void>;
}
