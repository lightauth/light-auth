import { type LightAuthOAuthProvider } from "../models";
import { createOAuth2Provider, mergeScopes, type LightAuthOAuthProviderOptions } from "./generic";

/**
 * Discord (OAuth 2.0, no OpenID Connect).
 * Default scopes: "identify", "email".
 */
export function createDiscordProvider(options: LightAuthOAuthProviderOptions): LightAuthOAuthProvider {
  return createOAuth2Provider({
    providerName: "discord",
    authorizationEndpoint: "https://discord.com/oauth2/authorize",
    tokenEndpoint: "https://discord.com/api/oauth2/token",
    revocationEndpoint: "https://discord.com/api/oauth2/token/revoke",
    userInfoEndpoint: "https://discord.com/api/users/@me",
    clientAuthentication: "client_secret_post",
    getProfile: async ({ fetchUserInfo }) => {
      const user = await fetchUserInfo();
      return {
        sub: String(user.id),
        email: (user.email ?? "") as string,
        name: (user.global_name ?? user.username ?? "") as string,
        picture: user.avatar ? `https://cdn.discordapp.com/avatars/${String(user.id)}/${String(user.avatar)}.png` : undefined,
      };
    },
    ...options,
    scopes: mergeScopes(["identify", "email"], options.scopes),
  });
}
