import { importPKCS8, SignJWT } from "jose";
import { type LightAuthOAuthProvider } from "../models";
import { createOAuthProvider } from "../services/provider-helpers";
import { mergeScopes, type LightAuthOAuthProviderOptions } from "./generic";

export type LightAuthAppleProviderOptions = Omit<LightAuthOAuthProviderOptions, "clientSecret"> & {
  /** Apple developer team id */
  teamId: string;
  /** Id of the "Sign in with Apple" private key */
  keyId: string;
  /** Content of the .p8 private key (PKCS#8 PEM) */
  privateKey: string;
};

/**
 * Sign in with Apple (OpenID Connect).
 * clientId is the Services ID. Default scopes: "name", "email".
 * The authorization response is posted to the callback URL (form_post), which requires HTTPS.
 */
export function createAppleProvider(options: LightAuthAppleProviderOptions): LightAuthOAuthProvider {
  const { teamId, keyId, privateKey, ...rest } = options;

  // Apple has no static client secret: it is a short-lived JWT signed with the developer private key
  const clientSecret = async () => {
    const key = await importPKCS8(privateKey.replace(/\\n/g, "\n"), "ES256");
    return await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: keyId })
      .setIssuer(teamId)
      .setSubject(rest.clientId)
      .setAudience("https://appleid.apple.com")
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(key);
  };

  return createOAuthProvider({
    providerName: "apple",
    issuer: "https://appleid.apple.com",
    clientAuthentication: "client_secret_post",
    // Apple posts the authorization response as soon as the name or the email is requested
    responseMode: "form_post",
    // PKCE is not part of the Sign in with Apple documentation
    pkce: false,
    getProfile: ({ tokens, callbackParameters }) => {
      const claims = tokens.idTokenClaims ?? {};
      const email = (claims.email ?? "") as string;

      // the user name is only sent on the first sign in, in the "user" callback parameter
      let name = "";
      try {
        const user = JSON.parse(callbackParameters.get("user") ?? "null");
        name = [user?.name?.firstName, user?.name?.lastName].filter(Boolean).join(" ");
      } catch {}

      return { sub: String(claims.sub), email, name: name || email };
    },
    ...rest,
    clientSecret,
    scopes: mergeScopes(["name", "email"], rest.scopes),
  });
}
