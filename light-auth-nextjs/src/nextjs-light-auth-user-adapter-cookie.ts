// import { decryptJwt, encryptJwt, LightAuthSession, LightAuthUser, LightAuthUserAdapter, buildSecret } from "@light-auth/core";
// import { nextJsLightAuthSessionStore } from "./nextjs-light-auth-session-store";

// /**
//  * A concrete User Store implementation for Node.js server-side,
//  * using the default cookie store to set and get users.
//  */

// const ALLOWED_COOKIE_SIZE = 4096;
// // Based on commented out section above
// const ESTIMATED_EMPTY_COOKIE_SIZE = 160;
// const CHUNK_SIZE = ALLOWED_COOKIE_SIZE - ESTIMATED_EMPTY_COOKIE_SIZE;

// export function splitCookieValue(value: string): Map<number, string> {
//   const chunkCount = Math.ceil(value.length / CHUNK_SIZE);

//   if (chunkCount === 1) {
//     return new Map<number, string>([[0, value]]);
//   }

//   const values = new Map<number, string>();
//   for (let i = 0; i < chunkCount; i++) {
//     const chunk = value.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
//     values.set(i, chunk);
//   }

//   return values;
// }

// export const nextJsLightAuthUserAdapterCookie: LightAuthUserAdapter = {
//   async getUser(): Promise<LightAuthUser | null> {
//     const cookies = await nextJsLightAuthSessionStore.getSession({ search: new RegExp(`^${DEFAULT_SESSION_COOKIE_NAME}\\.`) });

//     if (!cookies) return null;

//     // Filter out cookies that don't start with the default session cookie name
//     const filteredCookies = cookies.filter((c) => c.name.startsWith(DEFAULT_SESSION_COOKIE_NAME));

//     // Sort cookies by the integer suffix after the last dot in the name
//     const sortedCookies = filteredCookies.slice().sort((a, b) => {
//       const getIndex = (cookie: LightAuthCookie) => {
//         const parts = cookie.name.split(".");
//         return parseInt(parts[parts.length - 1], 10);
//       };
//       return getIndex(a) - getIndex(b);
//     });

//     // Reconstruct the JWT from the sorted cookie values
//     const jwt = sortedCookies.map((c) => c.value).join("");
//     if (!jwt) return null;

//     try {
//       var session = await decryptJwt(jwt, buildSecret(process.env));
//       return session as LightAuthUser;
//     } catch {
//       return null;
//     }
//   },

//   async setUser({ user }: { user: LightAuthUser }): Promise<void> {
//     const jwt = await encryptJwt(user, buildSecret(process.env));

//     // template for the cookie

//     const cookie: LightAuthCookie = {
//       name: "",
//       value: "",
//       httpOnly: true,
//       path: "/",
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       expires: user.expires_at,
//     };

//     // create chunks if needed (ie if the jwt is too long > 4096 bytes)
//     const chunks = splitCookieValue(jwt);

//     let cookies: LightAuthCookie[] = [];

//     for (const [key, value] of chunks) {
//       if (value === "") continue;

//       const chunkCookie: LightAuthCookie = {
//         ...cookie,
//         name: `${DEFAULT_SESSION_COOKIE_NAME}.${key}`,
//         value: value,
//       };
//       cookies.push(chunkCookie);
//     }
//     await nextJsLightAuthSessionStore.setSession({ cookies });
//   },

//   async deleteUser({ user }: { user: LightAuthUser }): Promise<void> {
//     await nextJsLightAuthSessionStore.deleteSessions({ search: new RegExp(`^${DEFAULT_SESSION_COOKIE_NAME}\\.\\d+$`) });
//   },
// };
