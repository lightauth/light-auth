import { buildFullUrl, type LightAuthCookie, type LightAuthRouter, type LightAuthServerEnv } from "@light-auth/core";
import { redirect } from '@tanstack/react-router'
import {
  getHeaders as tanstack_getheaders, getWebRequest,
  setCookie as tanstack_setCookie,
  parseCookies as tanstack_parseCookies,
} from '@tanstack/react-start/server'

import { json } from '@tanstack/react-start'
/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const tanstackReactStartLightAuthRouter: LightAuthRouter = {
  async redirectTo({ url }: { url: string }) {
    const headersData = tanstack_getheaders(); // { "content-type": "application/json", "x-custom-header": "value" }
    const incomingHeaders = new Headers();
    if (headersData) {
      // Iterate over the headers object and append them to the new Headers object
      for (const key in headersData) {
        const value = headersData[key];
        if (value) incomingHeaders.append(key, value);
      }
    }

    const fullUrl = buildFullUrl({ url, incomingHeaders });

    throw redirect({
      href: fullUrl.toString(),
      statusCode: 302, // Default redirect status code
      headers: incomingHeaders,

    })
  },

  async setCookies({ cookies }: { cookies?: LightAuthCookie[] }) {

    if (!cookies || cookies.length === 0) return;
    for (const cookie of cookies) {
      tanstack_setCookie(cookie.name, cookie.value, {
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge,
      });
    }
  },

  async getCookies({ search }: { search?: string | RegExp }): Promise<LightAuthCookie[]> {

    const lightAuthCookies: LightAuthCookie[] = [];
    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    const cookies = tanstack_parseCookies();

    for (const [requestCookieKey, requestCookieValue] of Object.entries(cookies)) {
      if (!search || !regex || regex.test(requestCookieKey)) lightAuthCookies.push({ name: requestCookieKey, value: requestCookieValue });
    }

    return lightAuthCookies;
  },

  async getUrl({ endpoint }: { endpoint?: string }) {
    const url = endpoint ?? getWebRequest()?.url;
    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of tanstackReactStartLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const headers = tanstack_getheaders();

    const incomingHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) if (value) incomingHeaders.append(key, value);

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return fullUrl.toString();
  },

  async getHeaders({ search }: { search?: string | RegExp }): Promise<Headers> {

    const headers = tanstack_getheaders();

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of Object.entries(headers)) {
      if (!search || !regex || regex.test(key)) if (value) filteredHeaders.append(key, value);
    }

    return filteredHeaders;
  },

  async getRequest({  }: { env: LightAuthServerEnv; basePath: string}): Promise<Request> {

    try {
      const request = getWebRequest();
      return request;
    } catch (error) {
      throw new Error(`light-auth: Error creating request object in getRequest of nuxtJsLightAuthRouter: ${error}`);
    }
  },

  returnJson({ data, init }: { data: {} | null; init?: ResponseInit | undefined }): Response {

    const response = json(data, {
      ...(init ?? {}),
      status: init?.status ?? 200,
    });

    return response;
  },
};
