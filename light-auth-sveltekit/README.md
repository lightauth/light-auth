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

> This getting started is based on the  [@light-auth/sveltekit](https://www.npmjs.com/package/@light-auth/sveltekit) package.
>
> You will find examples for all others frameworks in each relevant repository
>
> The [Light Auth](https://lightauth.github.io) documentation has also a lot of code examples for various scenario.

### 1) Install Light Auth

``` sh
npm -i @light-auth/sveltekit
```

### 2) Configure Light Auth

``` ts
// file: "./src/lib/server/auth.ts"

import { Google } from 'arctic';

import type { LightAuthProvider } from '@light-auth/core';
import { CreateLightAuth } from '@light-auth/sveltekit';
import { env } from '$env/dynamic/private';

const googleProvider: LightAuthProvider = {
	providerName: 'google',
	arctic: new Google(
      env.GOOGLE_CLIENT_ID, 
      env.GOOGLE_CLIENT_SECRET, 
      env.REDIRECT_URI),
	searchParams: new Map([['access_type', 'offline']])
};

export const { providers, handlers, signIn, signOut, getAuthSession, getUser } 
  = CreateLightAuth({providers: [googleProvider], env: env});


```

### 4) Add Light Auth Handlers

> Due to a bug in SvelteKit, the redirect response is not handled correctly.

Until this bug is fixed ([#13816](https://github.com/sveltejs/kit/issues/13816)), we need to handle the redirect manually.

``` ts
// file: "./src/routes/api/auth/[...lightauth]/+server.ts"

import { handlers } from '$lib/server/auth';
import { redirect, type RequestEvent } from '@sveltejs/kit';

const handlersSvelteKit = {
	GET: async (event?: RequestEvent) => {
		try {
			return await handlers.GET(event);
		} catch (error) {
			const redirectError = error as { status: number; location: string };
			if (redirectError && redirectError?.status === 302) redirect(redirectError.status, redirectError.location);
		}
	},
	POST: async (event?: RequestEvent) => {
		try {
			return await handlers.POST(event);
		} catch (error) {
			const redirectError = error as { status: number; location: string };
			if (redirectError && redirectError?.status === 302) redirect(redirectError.status, redirectError.location);
		}
	}
};

export const { GET, POST } = handlersSvelteKit;
```

### 5) Add login action

> Due to a bug in SvelteKit, the redirect response is not handled correctly.

Until this bug is fixed ([#13816](https://github.com/sveltejs/kit/issues/13816)), we need to handle the redirect manually.


``` ts
// file: "./src/routes/login/+page.server.ts"

import { signIn, getAuthSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async (event) => {
		try {
			const data = await event.request.formData();

			const providerName = data.get('providerName');
			const callbackUrl = data.get('callbackUrl');
			if (typeof providerName !== 'string') throw new Error('Invalid provider');
			if (typeof callbackUrl !== 'string') throw new Error('Invalid callback URL');

			await signIn(event, providerName, callbackUrl);
		} catch (error) {
			const r = error as { status: number; location: string };
			if (r?.status === 302) redirect(r.status, r.location);
		}
	}
} satisfies Actions;

```

### 6) Add login page

``` svelte
<!-- file: "./src/routes/login/+page.svelte" -->

<main>
    <div>
      <form method="POST">
        <input type="hidden" name="providerName" value="google" />
        <input type="hidden" name="callbackUrl" value="/" />
        <button type="submit">Login</button>
      </form>
    </div>
</main>

```

### 7) Use Light Auth in profile page

Server side:

``` ts
// file: "./src/routes/+page.server.ts"

import { getAuthSession } from '$lib/server/auth';

export const load = async (event) => {
	const session = await getAuthSession(event);
	return { session };
};

```

Svelte page:

``` svelte
<!-- file: "./src/routes/+page.svelte" -->

<script lang="ts">
	let { data } = $props();
</script>

<template>
  <div>
    <h1>Profile</h1>

    <div>
  		{#if data.session}
        <div>
            <p>✅ You are logged in !</p>
            <h3>Session:</h3>
            <pre>{{JSON.stringify(data.session, null, 2)}}</pre>
        </div>
		  {:else}
        <p>⚠️ You are not logged in</p>
      {/if}
    </div>
  </div>
</template>

```

## Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve Light Auth.

## License

This project is licensed under the MIT License.
