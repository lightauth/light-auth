# Changelog

`@light-auth/core` and the framework packages are released together, with the same version number.

## 0.4.0

Light Auth no longer uses [arctic](https://www.npmjs.com/package/arctic), which is deprecated: the OAuth 2.0 / OpenID Connect flows are now built on [oauth4webapi](https://github.com/panva/oauth4webapi) and [jose](https://github.com/panva/jose). This release also fixes several security issues, and contains breaking changes: read [Upgrading from 0.3.x](#upgrading-from-03x) first.

The framework packages now require `@light-auth/core` `^0.4.0`.

### Upgrading from 0.3.x

1. **Providers**: create them with the new factories, and remove arctic from your dependencies ([details](README.md#migrating-from-arctic-040)). A provider still configured with arctic throws on the first request, with a migration hint.

   ``` ts
   // before
   const googleProvider = { providerName: "google", arctic: new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT) };
   // after
   const googleProvider = createGoogleProvider({ clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET });
   ```

2. **Callback URL**: set the `LIGHT_AUTH_URL` environment variable (the callback URL defaults to `${LIGHT_AUTH_URL}${basePath}/callback/<providerName>`), or give each provider a `redirectUri`.
3. **Hooks**: `tokens` is a plain object (`accessToken`, `refreshToken`, `accessTokenExpiresAt`, `idToken`, `idTokenClaims`, `scopes`, `raw`) instead of the arctic `OAuth2Tokens` class. Replace `tokens.idToken()` and any manual decoding of the id_token with `tokens.idTokenClaims`, the validated claims. `tokens` is `undefined` when there is no OAuth sign in (credentials, session renewal, server-side saves): keep the existing claims in that case.
4. **Secret**: `LIGHT_AUTH_SECRET_VALUE` must be at least 32 characters long, instead of being padded. Light Auth throws at startup otherwise: generate one with `openssl rand -base64 32`. Existing sessions stay valid as long as the secret does not change.
5. **No more writes from the browser**: the client `setAuthSession` / `setUser` functions and the `/set_session` / `/set_user` endpoints are removed, as they let any visitor forge a session. Update the session or the user from server code, with the `setAuthSession` / `setUser` functions returned by `CreateLightAuth` (in a server action for instance).
6. **`getUser` in the browser** returns the user of the current session only, without `accessToken`, `refreshToken` and `accessTokenExpiresAt`. Read the tokens on the server, with the server `getUser`.
7. **`callbackUrl`** is limited to the paths and URLs of your application origin: any other value redirects to `/`.
8. **Requests built by hand** to the login, logout and credentials endpoints must send the CSRF token (`csrfToken` query parameter, or `x-light-auth-csrf-token` header). The client functions (`signIn`, `signOut`, `credentialsLogin`...) do it for you.

### Added

- Provider factories: `createGoogleProvider`, `createMicrosoftEntraIdProvider`, `createGitHubProvider`, `createDiscordProvider`, `createAppleProvider` (Sign in with Apple), and `createOidcProvider` / `createOAuth2Provider` for any other provider. The `scopes` of a provider are added to its default ones.
- OpenID Connect: endpoints discovered from the provider `issuer`, and id_tokens fully validated (signature against the provider keys, issuer, audience, expiration and nonce). PKCE is enabled for every provider.
- Microsoft Entra ID multi-tenant applications: the id_token issuer is checked against the tenant of the signed-in user.
- `signOut(true)` revokes the refresh token, then the access token, through the provider revocation endpoint (RFC 7009) or its `revokeToken` function (GitHub uses its REST API).
- `getProfile` provider option, with `fetchUserInfo` / `fetchResource` helpers, to read the user of OAuth 2.0 providers.
- `keyGenerator` rate limiter option, to identify the clients with the IP given by your framework (for example Express `req.ip`).
- `LightAuthHttpError`, thrown by `internalFetch` with the status and the body of the response.

### Security

- Sessions and users can no longer be written from the browser (see above).
- `/user` only returns the user of the current session, without its OAuth tokens: any user could be read by id.
- Open redirects through `callbackUrl` are blocked.
- Expired sessions are rejected: the session cookie now carries an `exp` claim, and a missing or invalid expiration counts as expired.
- The login, logout and credentials endpoints check a double-submit CSRF token, signed with HMAC.
- The server functions read the session and the user in-process, instead of calling the application through a URL built from the `Host` header.
- The secret is no longer padded to 32 characters.
- Rate limiter: the client IP is read from the right-most `X-Forwarded-For` entry, the one added by your proxy, as the other ones can be forged. A changing query string no longer gets a new counter, and each limiter has its own counters.

### Fixed

- Sessions are renewed once half of their lifetime has passed (sliding expiration). The renewal never happened, so active users were signed out when their session expired.
- `onSessionSaving` also runs when a session is renewed, like on every other save.
- Nuxt: `defineEventHandler(handlers)` failed on every request since 0.3.8.
- File user adapter (`createLightAuthUserAdapter`): two user ids could be stored in the same file. Existing files are migrated on the next save.
- An invalid or revoked refresh token is cleared, instead of being sent again on every request.
- Rate limiter: one extra request was allowed in each new time window.
- `createLightAuthRouter`: the cookies set during a request were lost on redirects and JSON responses, and the cookie `domain` was ignored.
- The credentials client functions return the error message of the server ("Invalid email or password") instead of "Request failed with status 401".
- IP helpers: some private ranges were not detected (172.16.0.0/12, link-local and IPv6 unique local addresses, IPv4-mapped addresses), and malformed addresses were accepted.
- The CSRF origin check reports the origin and the host that do not match, instead of "Invalid origin header".

### Internal

- Test suite for `@light-auth/core` (vitest, with an in-memory OAuth 2.0 / OpenID Connect provider), run with coverage thresholds by the new Tests workflow.
