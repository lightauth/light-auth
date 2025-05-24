import { buildFullUrl, type LightAuthCookie, type LightAuthRouter, type LightAuthServerEnv } from "@light-auth/core";
import { H3Event, type EventHandlerRequest, parseCookies, setCookie, getHeaders, sendRedirect } from "h3";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nuxtJsLightAuthRouter: LightAuthRouter = {
  async redirectTo({ url, event }: { url: string; event?: H3Event<EventHandlerRequest> }) {
    if (!event) throw new Error("Event is required in redirectTo of nuxtJsLightAuthRouter.");

    const headersData = getHeaders(event); // { "content-type": "application/json", "x-custom-header": "value" }
    const incomingHeaders = new Headers();
    if (headersData) {
      // Iterate over the headers object and append them to the new Headers object
      for (const key in headersData) {
        const value = headersData[key];
        if (value) incomingHeaders.append(key, value);
      }
    }

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    await sendRedirect(event, fullUrl.toString());
  },

  async setCookies({ cookies, event }: { cookies?: LightAuthCookie[]; event?: H3Event<EventHandlerRequest> }) {
    if (!event) throw new Error("Event is required in redirectTo of nuxtJsLightAuthRouter.");

    if (!cookies || cookies.length === 0) return;
    for (const cookie of cookies) {
      setCookie(event, cookie.name, cookie.value, {
        path: cookie.path,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge,
      });
    }
  },

  async getCookies({ search, event }: { search?: string | RegExp; event?: H3Event<EventHandlerRequest> }): Promise<LightAuthCookie[]> {
    if (!event) throw new Error("Event is required in getCookies of nuxtJsLightAuthRouter.");

    const lightAuthCookies: LightAuthCookie[] = [];
    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    const cookies = parseCookies(event);

    for (const [requestCookieKey, requestCookieValue] of Object.entries(cookies)) {
      if (!search || !regex || regex.test(requestCookieKey)) lightAuthCookies.push({ name: requestCookieKey, value: requestCookieValue });
    }

    return lightAuthCookies;
  },

  async getUrl({ endpoint, event }: { endpoint?: string; event?: H3Event<EventHandlerRequest> }) {
    const url = endpoint ?? event?.node.req?.url;
    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of nuxtJsLightAuthRouter.");

    if (url.startsWith("http")) return url;

    if (!event) return url;

    const headersData = getHeaders(event);
    const incomingHeaders = new Headers();
    for (const [key, value] of Object.entries(headersData)) if (value) incomingHeaders.append(key, value);

    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return fullUrl.toString();
  },

  async getHeaders({ search, event }: { search?: string | RegExp; event?: H3Event<EventHandlerRequest> }): Promise<Headers> {
    if (!event) return new Headers();

    const headersData = getHeaders(event);

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of Object.entries(headersData)) {
      if (!search || !regex || regex.test(key)) if (value) filteredHeaders.append(key, value);
    }

    return filteredHeaders;
  },

  async getRequest({ env, basePath, event }: { env: LightAuthServerEnv; basePath: string; event?: H3Event<EventHandlerRequest> }): Promise<Request> {
    if (!event) throw new Error("Event is required in getRequest of nuxtJsLightAuthRouter.");

    try {
      const url = await this.getUrl({ env, basePath, event });
      const headers = await this.getHeaders({ env, basePath, event });
      return new Request(url, { method: event.node.req.method, headers: headers });
    } catch (error) {
      throw new Error(`light-auth: Error creating request object in getRequest of nuxtJsLightAuthRouter: ${error}`);
    }
  },

  returnJson({ data }: { data: {} | null }) {
    return data;
  },
};
