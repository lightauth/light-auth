import { buildFullUrl, type LightAuthConfig, type LightAuthCookie, type LightAuthRouter, type LightAuthSession, type LightAuthUser } from "@light-auth/core";
import { redirect, json, type RequestEvent } from "@sveltejs/kit";

export const sveltekitLightAuthRouter: LightAuthRouter = {
  returnJson: function ({ data }: { data: unknown | null }): Response {
    return json(data);
  },

  getUrl: function ({ endpoint, event, args }: { endpoint?: string; event?: RequestEvent; args?: Record<string, unknown> }): string {
    const url = endpoint ?? event?.url?.toString();

    if (!url) throw new Error("light-auth: No url provided and no RequestEvent object available in getUrl of sveltekitLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const isServerSide = typeof window === "undefined";
    if (!isServerSide) return url;
    if (!event) return url;

    const parsedUrl = buildFullUrl({ url, incomingHeaders: event.request.headers });
    return parsedUrl.toString();
  },

  redirectTo: function ({ url, event }: { url: string; event?: RequestEvent }): Response {
    console.log("Sveltekit- Redirecting to:", url);
    redirect(302, url);
  },

  getHeaders: function ({ search, event }: { search?: string | RegExp; event?: RequestEvent }): Headers {
    if (!event) return new Headers();

    const incomingHeaders = event.request.headers;

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of incomingHeaders.entries()) {
      if (!search || !regex) filteredHeaders.append(key, value);
      else if (regex.test(key)) {
        filteredHeaders.append(key, value);
      }
    }

    return filteredHeaders;
  },
  setCookies: function <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
    config,
    cookies,
    event,
  }: {
    config: LightAuthConfig<Session, User>;
    cookies?: LightAuthCookie[];
    event?: RequestEvent;
  }): void {
    if (!event) throw new Error("event is required in setCookies of sveltekitLightAuthRouter");

    for (const cookie of cookies ?? []) {
      event.cookies.set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge,
        path: cookie.path ?? "/",
      });
    }
  },

  getCookies: function ({ search, event }: { search?: string | RegExp; event?: RequestEvent }): LightAuthCookie[] {
    if (!event) throw new Error("RequestEvent is required in getCookies of sveltekitLightAuthRouter");

    const cookies: LightAuthCookie[] = [];
    const regex = typeof search === "string" ? new RegExp(search) : search;

    for (const { name, value } of event.cookies.getAll()) {
      if (!search || !regex || regex.test(name)) cookies.push({ name: name, value: value || "" });
    }

    return cookies;
  },

  getRequest: function <Session extends LightAuthSession = LightAuthSession, User extends LightAuthUser<Session> = LightAuthUser<Session>>({
    config,
    event,
  }: {
    config: LightAuthConfig<Session, User>;
    event?: RequestEvent;
  }): Request {
    if (!event) throw new Error("RequestEvent is required in getRequest of sveltekitLightAuthRouter");

    return event.request;
  },
};
