import { type LightAuthOAuthProvider } from "../models";
import { createOAuth2Provider, mergeScopes, type LightAuthOAuthProviderOptions } from "./generic";

type GitHubEmail = { email: string; primary: boolean; verified: boolean };

/**
 * GitHub (OAuth 2.0, no OpenID Connect).
 * Default scopes: "read:user", "user:email".
 */
export function createGitHubProvider(options: LightAuthOAuthProviderOptions): LightAuthOAuthProvider {
  const { clientId, clientSecret } = options;

  return createOAuth2Provider({
    providerName: "github",
    authorizationEndpoint: "https://github.com/login/oauth/authorize",
    tokenEndpoint: "https://github.com/login/oauth/access_token",
    userInfoEndpoint: "https://api.github.com/user",
    clientAuthentication: "client_secret_post",
    getProfile: async ({ fetchUserInfo, fetchResource }) => {
      const user = await fetchUserInfo();

      let email = typeof user.email === "string" ? user.email : undefined;
      if (!email) {
        // the public email can be hidden: use the primary verified one (user:email scope)
        const emails = (await fetchResource("https://api.github.com/user/emails")) as GitHubEmail[];
        email = emails.find((e) => e.primary && e.verified)?.email ?? emails.find((e) => e.verified)?.email;
      }

      return {
        sub: String(user.id),
        email: email ?? "",
        name: (user.name ?? user.login ?? "") as string,
        picture: typeof user.avatar_url === "string" ? user.avatar_url : undefined,
      };
    },
    // GitHub does not implement RFC 7009: access tokens are revoked through its REST API
    revokeToken: async ({ token, tokenTypeHint }) => {
      if (tokenTypeHint !== "access_token") return;
      const secret = typeof clientSecret === "function" ? await clientSecret() : clientSecret;
      const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/token`, {
        method: "DELETE",
        headers: {
          authorization: `Basic ${btoa(`${clientId}:${secret ?? ""}`)}`,
          accept: "application/vnd.github+json",
          "content-type": "application/json",
          "user-agent": "light-auth",
        },
        body: JSON.stringify({ access_token: token }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok && response.status !== 404) throw new Error(`light-auth: GitHub token revocation failed with status ${response.status}`);
    },
    ...options,
    scopes: mergeScopes(["read:user", "user:email"], options.scopes),
    // the GitHub API rejects requests without a User-Agent header
    headers: new Map([["user-agent", "light-auth"], ...(options.headers ?? [])]),
  });
}
