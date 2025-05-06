import { buildFullUrl, type LightAuthRouter } from "@light-auth/core";
import type { APIContext } from "astro";

export const astroLightAuthRouter: LightAuthRouter = {
  writeJson: function ({ data, context }: { data: {} | null; context?: APIContext }): Response {
    return new Response(JSON.stringify(data));
  },

  getUrl: function ({ endpoint, context }: { endpoint?: string; context?: APIContext }): string {
    console.log("astroLightAuthRouter getUrl", endpoint, context);
    if (!context) return endpoint || "/";

    let url = endpoint;
    if (!url) url = context?.request.url;

    if (!url) {
      throw new Error("light-auth: No url provided and no request object available in getUrl of astroLightAuthRouter.");
    }

    if (url.startsWith("http")) return url;

    const parsedUrl = buildFullUrl({ endpoint, req: context.request });
    return parsedUrl.toString();
  },

  redirectTo: function ({ url, context }: { url: string; context?: APIContext }): Response {
    if (!context) throw new Error("APIContext is required in redirectTo function of astroLightAuthRouter");

    return context.redirect(url, 302);
  },

  getHeaders: function ({ search, context }: { search?: string | RegExp; context?: APIContext }): Headers {
    if (!context) throw new Error("APIContext is required in getHeaders function of astroLightAuthRouter");

    const incomingHeaders = context.request.headers;

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
  setHeaders: function ({ res, headers }: { res?: Response; headers: Map<string, string> | { [key: string]: string } }): Response {
    if (!res) throw new Error("Response is required in setHeaders of expressLightAuthRouter");

    // for (const [key, value] of headers instanceof Map ? headers : Object.entries(headers)) {
    //   if (res.headersSent) {
    //     res.setHeader(key, value);
    //   } else {
    //     res.append(key, value);
    //   }
    // }
    return res;
  },
};
