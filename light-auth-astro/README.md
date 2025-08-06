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

> This getting started is based on the  [@light-auth/astro](https://www.npmjs.com/package/@light-auth/astro) package.
>
> You will find examples for all others frameworks in each relevant repository
>
> The [Light Auth](https://lightauth.github.io) documentation has also a lot of code examples for various scenario.

### 1) Install Light Auth

``` sh
npm -i @light-auth/astro
```

### 2) Configure Light Auth

``` ts
// file: "./src/lib/auth.ts"

import { Google } from "arctic";
import { type LightAuthProvider } from "@light-auth/core";
import { CreateLightAuth } from "@light-auth/astro";

const googleProvider: LightAuthProvider = {
  providerName: "google",
  arctic: new Google(import.meta.env.GOOGLE_CLIENT_ID, 
        import.meta.env.GOOGLE_CLIENT_SECRET, 
        import.meta.env.REDIRECT_URI),
  searchParams: new Map([["access_type", "offline"]]),
};


export const { providers, handlers, getAuthSession, getUser, signIn, signOut } 
    = CreateLightAuth({ providers: [googleProvider], env: import.meta.env });


```

### 3) Add Light Auth Handlers


``` ts
// file: "./pages/api/auth/[...lightauth].ts"

import type { APIRoute } from "astro";
import { handlers } from "@/lib/auth";
export const { GET, POST }: { GET: APIRoute; POST: APIRoute } = handlers;

```

### 4) Add login action

Due to a limitation from Astro, we can't redirect from the action code itself

More info on this issue ([#11613](https://github.com/withastro/astro/issues/11613)).  
The redirect is handled in the index.astro file, in the frontmatter section.

``` ts
// file: "./src/actions/index.ts"

import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({ providerName: z.string(), callbackUrl: z.string() }),
    handler(input, context) {
      return { providerName: input.providerName, callbackUrl: input.callbackUrl };
    },
  }),
};
```


### 5) Add login page

``` astro
<!-- file: "./pages/login.astro" -->

---
import { signIn } from "@/lib/auth";
import { actions } from "astro:actions";

const result = Astro.getActionResult(actions.login);
if (result && !result.error && result.data) {
  return await signIn(Astro, result.data.providerName, result.data.);
}
---

<Layout title="Astro Authentication using light-auth">
    <div>
        <form method="POST" action={actions.login}>
            <input type="hidden" name="providerName" value="google" />
            <input type="hidden" name="callbackUrl" value="/" />
            <button type="submit">Login</button>
        </form>            
  </div>
</Layout>
```

### 6) Use Light Auth in profile page

``` astro
---
// Component Imports
import Layout from "@/layouts/main.astro";
import { getAuthSession } from "@/lib/auth";

const session = await getAuthSession(Astro);
---

<Layout title="Astro Authentication using light-auth">
    <div>
      {session != null ? (
          <p>✅ You are logged in!</p>
          <div>{session.email}</div>
        ) : (
          <div>
            <button id="btnLogin">You are not logged</button>
          </div>
        )
      }
  </div>

</Layout>
```

## Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve Light Auth.

## License

This project is licensed under the MIT License.
