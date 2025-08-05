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

**Light Auth** integrates seamlessly, letting you add authentication with a sparkle ✨ to any stack!

## Getting Started

> This getting started is based on the  [light-auth-nuxt](https://www.npmjs.com/package/@light-auth/nuxt) package.
>
> You will find examples for all others frameworks in each relevant repository
>
> The [Light Auth](https://lightauth.github.io) documentation has also a lot of code examples for various scenario.

### 1) Install Light Auth

``` sh
npm -i @light-auth/nuxt
```

### 2) Add specific Nuxt config

``` ts
export default defineNuxtConfig({
  runtimeConfig: {
    GoogleClientId: "", // can be overridden by NUXT_GOOGLE_CLIENT_ID environment variable
    GoogleClientSecret: "", // can be overridden by NUXT_GOOGLE_CLIENT_SECRET environment variable
    RedirectUri: "", // can be overridden by NUXT_REDIRECT_URI environment variable
  },
  .... ,    
  .... ,  
  build: {
    transpile: ["@light-auth/nuxt"],
  },
});

```

### 3) Configure Light Auth

``` ts
// file: "./server/utils/auth.ts"

import { Google } from "arctic";
import { CreateLightAuth } from "@light-auth/nuxt";
import type { LightAuthProvider } from "@light-auth/core";

const config = useRuntimeConfig();

const googleProvider: LightAuthProvider = {
  providerName: "google",
  arctic: new Google(
    config.GoogleClientId,
    config.GoogleClientSecret,
    config.RedirectUri
  ),
  searchParams: new Map([["access_type", "offline"]]),
};

export const { handlers, signIn, signOut, getAuthSession, getUser } =
  CreateLightAuth({
    providers: [googleProvider],
  });

```

### 4) Add Light Auth Handlers

``` ts
// file: "./server/api/auth/[...lightauth].ts"

export default defineEventHandler(handlers);
```

### 5) Add login action

``` ts
// file: "./server/api/actions/login.ts"

export default defineEventHandler(async (event) => {
  const querieObjects = getQuery(event);
  const providerName = querieObjects.providerName?.toString() ?? "google";
  const callbackUrl = querieObjects.callbackUrl?.toString() ?? "/";

  await signIn(event, providerName, callbackUrl);
});

```

### 6) Add login page

``` vue
// file: "./pages/login.vue"

<template>
    <div>
        <form action="api/actions/login" method="POST">
            <input type="hidden" name="providerName" value="google" />
            <input type="hidden" name="callbackUrl" value="/" />
            <UButton type="submit">Login</UButton>
        </form>
    </div>
</template>

```

### 7) Use Light Auth in profile page

``` vue
// file: "./pages/index.vue"

<script setup lang="ts">
import { CreateLightAuthClient } from "@light-auth/nuxt/client";
const { useSession} = CreateLightAuthClient();
const { data: session, refresh, status, pending, error } = useSession();


<template>
  <div>
    <h1>Profile</h1>

    <div>
        <div v-if="session">
            <p>✅ You are logged in !</p>
            <h3>Session:</h3>
            <pre>{{JSON.stringify(session, null, 2)}}</pre>
        </div>

        <div v-else>
          <p>⚠️ You are not logged in</p>
        </div>
    </div>
  </div>
</template>

```

## Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve Light Auth.

## License

This project is licensed under the MIT License.
