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

``` ts
import { Google, Github } from "arctic";
import { CreateLightAuth } from "@light-auth/nextjs";

const googleProvider = {
  providerName: "google",
  arctic: new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT),
};

const githubProvider = {
  providerName: "github",
  arctic: new GitHub(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT)
};

export const { providers, handlers, signIn, signOut, getAuthSession, getUser } = CreateLightAuth({
  providers: [googleProvider, githubProvider]
```

### 3) Add Light Auth Handlers

``` ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

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

## Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve Light Auth.

## License

This project is licensed under the MIT License.
