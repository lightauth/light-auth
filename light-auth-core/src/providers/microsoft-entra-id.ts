import { type LightAuthOAuthProvider } from "../models";
import { toStandardProfile } from "../services/oauth-client";
import { createOidcProvider, type LightAuthOAuthProviderOptions } from "./generic";

const TENANT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Microsoft Entra ID (OpenID Connect).
 * tenant: a tenant id, a domain name, "common" (default), "organizations" or "consumers".
 * Add the "offline_access" scope to get a refresh token.
 */
export function createMicrosoftEntraIdProvider(options: LightAuthOAuthProviderOptions & { tenant?: string }): LightAuthOAuthProvider {
  const { tenant = "common", ...rest } = options;
  const authority = `https://login.microsoftonline.com/${tenant}`;

  // except for a tenant id, the id_token issuer contains the tenant id of the signed-in user
  const isTenantId = TENANT_ID_PATTERN.test(tenant);

  return createOidcProvider({
    providerName: "microsoft",
    issuer: isTenantId ? `${authority}/v2.0` : "https://login.microsoftonline.com/{tenantid}/v2.0",
    // explicit endpoints: the multi-tenant discovery document has a "{tenantid}" placeholder as issuer
    authorizationEndpoint: `${authority}/oauth2/v2.0/authorize`,
    tokenEndpoint: `${authority}/oauth2/v2.0/token`,
    jwksUri: `${authority}/discovery/v2.0/keys`,
    userInfoEndpoint: "https://graph.microsoft.com/oidc/userinfo",
    getIdTokenIssuer: isTenantId ? undefined : (claims) => `https://login.microsoftonline.com/${String(claims.tid)}/v2.0`,
    getProfile: ({ tokens }) => {
      const claims = tokens.idTokenClaims ?? {};
      // email is an optional claim in Entra ID, preferred_username usually holds the sign-in email
      return { ...toStandardProfile(claims), email: (claims.email ?? claims.preferred_username ?? "") as string };
    },
    ...rest,
  });
}
