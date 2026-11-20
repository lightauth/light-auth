# Light Auth

<p align="center">
    <img src="https://github.com/lightauth/.github/blob/main/images/light-auth.svg" alt="Light Auth Logo" width="120"/>
</p>

[Light Auth](https://lightauth.github.io) is a lightweight authentication solution designed for simplicity and ease of integration.

It provides essential authentication features with minimal configuration, making it ideal for small projects, prototypes, or applications that require straightforward user sign-in functionality.

## Features

- Simple setup and configuration
- Supports basic authentication flows
- Minimal dependencies
- Easily extensible for custom requirements
- Server side an Client side components

## Framework Compatibility

Light Auth shines across your favorite frameworks! Whether you’re building with  

| Framework                                   | NPM Package                                                                 | GitHub Sample                                                                                 |
|-----------------------------------------------|-----------------------------------------------------------------------------|----------------------------------------------------------------------------------------------|
| ![NextJS](https://github.com/lightauth/.github/blob/main/images/nextjs.svg) **Next.js**   | [light-auth-nextjs](https://www.npmjs.com/package/@light-auth/nextjs)       | [Next.js Sample](https://github.com/lightauth/light-auth-nextjs-sample-one)           |
| ![Astro](https://github.com/lightauth/.github/blob/main/images/astro.svg) **Astro**       | [light-auth-astro](https://www.npmjs.com/package/@light-auth/astro)         | [Astro Sample](https://github.com/lightauth/light-auth-astro-sample-one)              |
| ![Nuxt](https://github.com/lightauth/.github/blob/main/images/nuxtjs.svg) **Nuxt**        | [light-auth-nuxt](https://www.npmjs.com/package/@light-auth/nuxt)           | [Nuxt Sample](https://github.com/lightauth/light-auth-nuxt-sample-one)                |
| ![SvelteKit](https://github.com/lightauth/.github/blob/main/images/sveltekit.svg) **SvelteKit** | [light-auth-sveltekit](https://www.npmjs.com/package/@light-auth/sveltekit) | [SvelteKit Sample](https://github.com/lightauth/light-auth-sveltekit-sample-one)      |
| ![Express](https://github.com/lightauth/.github/blob/main/images/express.svg) **Express** | [light-auth-express](https://www.npmjs.com/package/@light-auth/express)     | [Express Sample](https://github.com/lightauth/light-auth-express-sample-one)          |
| ![Tanstack Start](https://lightauth.github.io/tanstack.svg) **Tanstack Start** | [light-auth-tanstack-react-start](https://www.npmjs.com/package/@light-auth/tanstack-react-start)     | [Tanstack Start Sample](https://github.com/lightauth/light-auth-tanstack-sample-one)          |

**Light Auth** integrates seamlessly, letting you add authentication with a sparkle ✨ to any stack!

## Getting Started

> This getting started is based on the  [light-auth-nextjs](https://www.npmjs.com/package/@light-auth/nextjs) package.
>
> You will find examples for all others frameworks in each relevant repository
>
> The [Light Auth](https://lightauth.github.io) documentation has also a lot of code examples for various scenario.

### 1) Install Light Auth

``` sh
npm -i @light-auth/nextjs
```

### 2) Configure Light Auth

Set a random `LIGHT_AUTH_SECRET_VALUE` environment variable of at least 32 characters, used to encrypt the session cookie (light auth refuses to start otherwise), and the public URL of your application, used to compute the providers callback URL (`${LIGHT_AUTH_URL}/api/auth/callback/<providerName>`):

``` sh
LIGHT_AUTH_SECRET_VALUE=$(openssl rand -base64 32)
LIGHT_AUTH_URL=http://localhost:3000
```

``` ts
import { CreateLightAuth } from "@light-auth/nextjs";
import { createGitHubProvider, createGoogleProvider } from "@light-auth/core";

const googleProvider = createGoogleProvider({
  clientId: GOOGLE_CLIENT_ID,
  clientSecret: GOOGLE_CLIENT_SECRET,
});

const githubProvider = createGitHubProvider({
  clientId: GITHUB_CLIENT_ID,
  clientSecret: GITHUB_CLIENT_SECRET,
});

export const { providers, handlers, signIn, signOut, getAuthSession, getUser } = CreateLightAuth({
  providers: [googleProvider, githubProvider]
});
```

### 3) Add Light Auth Handlers

``` ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

> Sessions and users can only be modified from server code (`setAuthSession`, `setUser` returned by `CreateLightAuth`).
> From the browser, the client functions are read-only (`getAuthSession`, `getUser`), and `getUser` never returns the OAuth access / refresh tokens.

### 4) Use Light Auth

``` tsx
import { getAuthSession, signIn  } from "@/lib/auth";

export default async function Home() {
  const session = await getAuthSession();

  return (
    <div>
      {session != null ? (
        <div>
          <p>✅ You are logged in!</p>
          <div>Session Email: {session.email}</div>
          <div>Session Provider: {session.providerName}</div>
        </div>
      ) : (
        <div>
            <form
            action={async () => {
                "use server";
                await signIn("google", "/profile");
            }}
            >
            <button type="submit">login using a form action</button>
            </form>
        </div>
      )}
    </div>
  );
}
```

## Providers

| Factory | Provider | Default scopes |
| --- | --- | --- |
| `createGoogleProvider` | Google (OpenID Connect), set `accessType: "offline"` to get a refresh token | openid, profile, email |
| `createMicrosoftEntraIdProvider` | Microsoft Entra ID (OpenID Connect), `tenant` defaults to `"common"`, add `offline_access` to get a refresh token | openid, profile, email |
| `createGitHubProvider` | GitHub (OAuth 2.0) | read:user, user:email |
| `createDiscordProvider` | Discord (OAuth 2.0) | identify, email |
| `createAppleProvider` | Sign in with Apple (OpenID Connect), with `teamId`, `keyId` and `privateKey` instead of a client secret | name, email |
| `createOidcProvider` | Any OpenID Connect provider, configured from its `issuer` (discovery) | openid, profile, email |
| `createOAuth2Provider` | Any OAuth 2.0 provider, with explicit endpoints and a `getProfile` function | none |

Every factory takes a `clientId`, a `clientSecret`, an optional `redirectUri` (default `${LIGHT_AUTH_URL}${basePath}/callback/<providerName>`) and `scopes`, added to the default ones.

OpenID Connect id_tokens are fully validated (signature against the provider keys, issuer, audience, expiration and nonce), and their claims are available in the `onSessionSaving` / `onUserSaving` hooks:

``` ts
onSessionSaving: async (session, tokens) => {
  if (typeof tokens?.idTokenClaims?.given_name === "string") session.firstName = tokens.idTokenClaims.given_name;
  return session;
},
```

### Migrating from arctic (0.4.0)

[arctic](https://www.npmjs.com/package/arctic) is deprecated and no longer used by light auth, you can remove it from your dependencies:

``` ts
// before
import { Google } from "arctic";
const googleProvider = { providerName: "google", arctic: new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT) };

// after
import { createGoogleProvider } from "@light-auth/core";
const googleProvider = createGoogleProvider({ clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET, redirectUri: REDIRECT });
```

The hooks receive a plain `tokens` object (`accessToken`, `refreshToken`, `accessTokenExpiresAt`, `idToken`, `idTokenClaims`, `scopes`, `raw`) instead of the arctic `OAuth2Tokens` class.

## Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve Light Auth.

## License

This project is licensed under the MIT License.
