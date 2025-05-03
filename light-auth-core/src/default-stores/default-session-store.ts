// import { SessionStore } from "../stores/session-store";
// import { LightAuthSession } from "../models/light-auth-session";
// import { Cookie } from "../models/cookie";
// import { DEFAULT_SESSION_COOKIE_NAME } from "../constants";
// import { decryptJwt, encryptJwt } from "../services/jwt";
// import { defaultNavigatorStore } from "./default-navigatore-store";
// import { splitCookieValue } from "../services/cookie-splitter";

// /**
//  * A concrete SessionStore implementation for Node.js server-side,
//  * using the default cookie store to set and get session cookies.
//  */

// export const defaultSessionStore: SessionStore = {
//   async getSession({ req, res }: { req?: Request; res?: Response }): Promise<LightAuthSession | null> {
//     const cookie = await defaultNavigatorStore.getCookie({ req, res, name: DEFAULT_SESSION_COOKIE_NAME });
//     if (!cookie || !cookie.value) return null;

//     try {
//       var session = await decryptJwt(cookie.value);
//       return session as LightAuthSession;
//     } catch {
//       return null;
//     }
//   },

//   async setSession({ req, res, session }: { req?: Request; res?: Response; session: LightAuthSession }): Promise<void> {
//     const jwt = await encryptJwt(session);

//     const cookie: Cookie = {
//       name: "",
//       value: "",
//       httpOnly: true,
//       path: "/",
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//       expires: session.expires_at,
//     };

//     const chunks = splitCookieValue(jwt);

//     for (const [key, value] of chunks) {
//       const chunkCookie: Cookie = {
//         ...cookie,
//         name: `${DEFAULT_SESSION_COOKIE_NAME}_${key}`,
//         value: value,
//       };
//       await defaultNavigatorStore.setCookie({ req, res, cookie: chunkCookie });
//     }
//   },

//   async deleteSession({ req, res }: { req?: Request; res?: Response }): Promise<void> {
//     await defaultNavigatorStore.deleteCookie({ req, res, name: DEFAULT_SESSION_COOKIE_NAME });
//   },

//   generateSessionId(): string {
//     return Math.random().toString(36).slice(2);
//   },
// };
