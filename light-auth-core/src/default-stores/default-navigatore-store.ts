// import { NavigatoreStore } from "../stores/navigatore-store";
// import { Cookie } from "../models/cookie";
// import * as cookieParser from "cookie";

// export const defaultNavigatorStore: NavigatoreStore = {
//   getUrl: ({ req }: { req?: Request }) => {
//     if (!req) {
//       throw new Error("Request is required in defaultNavigatorStore");
//     }
//     const url = new URL(req.url);
//     return url;
//   },

//   getHeaders: ({ req }: { req?: Request }): Headers => {
//     if (!req) {
//       throw new Error("Request is required in defaultNavigatorStore");
//     }
//     const headers = new Headers(req.headers);
//     return headers;
//   },
//   setHeaders: ({ req, res, headers }: { req?: Request; res?: Response; headers: Map<string, string> | { [key: string]: string } }): Response => {
//     if (!res) throw new Error("Response is required in defaultNavigatorStore");

//     for (const [key, value] of headers instanceof Map ? headers : Object.entries(headers)) {
//       if (res.headers.has(key)) {
//         res.headers.set(key, value);
//       } else {
//         res.headers.append(key, value);
//       }
//     }
//     return res;
//   },

//   redirectTo: ({ req, res, url }: { req?: Request; res?: Response; url: string }): Response => {
//     const newRes = res && res.status === 302 ? res : new Response(`Redirecting to ${url}`, { status: 302, headers: new Headers(req?.headers) });
//     newRes.headers.set("Content-Type", "text/plain");
//     newRes.headers.set("Location", url);
//     return newRes;
//   },

//   setCookie({ req, res, cookie }: { req?: Request; res?: Response; cookie: Cookie }): void {
//     if (!res) {
//       throw new Error("Response is required in defaultNavigatorStore");
//     }

//     // serialize the cookie object into a string
//     const serialized = cookieParser.serialize(cookie.name, cookie.value, {
//       httpOnly: cookie.httpOnly,
//       secure: cookie.secure,
//       sameSite: cookie.sameSite,
//       path: cookie.path,
//       maxAge: cookie.maxAge,
//       domain: cookie.domain,
//     });

//     if (res.headers.has("Set-Cookie")) res.headers.append("Set-Cookie", serialized);
//     else res.headers.set("Set-Cookie", serialized);
//   },

//   getCookie({ req, res, name }: { req?: Request; res?: Response; name: string }): Cookie | null {
//     if (!req) {
//       throw new Error("Request is required in defaultNavigatorStore");
//     }

//     const cookieHeader = req.headers.get(name);
//     if (!cookieHeader) return null;
//     const cookie = cookieParser.parse(cookieHeader) as Cookie;
//     return cookie;
//   },

//   async getCookies({ req, res, name }: { req?: Request; res?: Response; name: string[] }): Promise<Cookie[] | null> {
//     if (!req) {
//       throw new Error("Request is required in defaultNavigatorStore");
//     }

//     if (!res) {
//       throw new Error("Response is required in defaultNavigatorStore");
//     }

//     const setCookieHeaders = res.headers.getSetCookie ? res.headers.getSetCookie() : res.headers.get("Set-Cookie");
//     if (!setCookieHeaders) return null;

//     const cookies: Cookie[] = [];
//     const cookiesValues = Array.isArray(setCookieHeaders) ? setCookieHeaders : typeof setCookieHeaders === "string" ? [setCookieHeaders] : [];

//     for (const header of cookiesValues) {
//       const parsed = cookieParser.parse(header);
//       console.log("Parsed cookies:", parsed);
//       for (const key in parsed) {
//         if (key.includes(name)) {
//           cookies.push({
//             name: key,
//             value: parsed[key] || "",
//             httpOnly: /httponly/i.test(header),
//             secure: /secure/i.test(header),
//             sameSite: /samesite=(\w+)/i.test(header) ? (header.match(/samesite=(\w+)/i)![1] as any) : undefined,
//             path: /path=([^;]+)/i.test(header) ? header.match(/path=([^;]+)/i)![1] : undefined,
//             maxAge: /max-age=(\d+)/i.test(header) ? parseInt(header.match(/max-age=(\d+)/i)![1], 10) : undefined,
//             domain: /domain=([^;]+)/i.test(header) ? header.match(/domain=([^;]+)/i)![1] : undefined,
//           });
//         }
//       }
//     }

//     return cookies;
//   },

//   deleteCookie({ req, res, name }: { req?: Request; res?: Response; name: string }): void {
//     if (!res) {
//       throw new Error("Response is required in defaultNavigatorStore");
//     }

//     const serialized = cookieParser.serialize(name, "", {
//       maxAge: 0,
//       expires: new Date(0),
//       path: "/",
//     });

//     if (res.headers.has("Set-Cookie")) res.headers.append("Set-Cookie", serialized);
//     else res.headers.set("Set-Cookie", serialized);
//   },
// };
