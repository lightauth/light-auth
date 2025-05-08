import { buildFullUrl, LightAuthConfig, LightAuthRouter } from "@light-auth/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthRouter: LightAuthRouter = {
  writeJson(args: { config: LightAuthConfig; data: {} | null }): NextResponse {
    return NextResponse.json(args.data);
  },

  async redirectTo({ config, url }: { config: LightAuthConfig; url: string }): Promise<NextResponse> {
    const incomingHeaders = await headers();
    const fullUrl = buildFullUrl({ url, incomingHeaders });
    return redirect(fullUrl.toString());
  },

  async getUrl({ endpoint, req }: { endpoint?: string; req?: NextRequest }) {
    const url = endpoint ?? req?.url;
    if (!url) throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");

    if (url.startsWith("http")) return url;

    const headersData = await headers();

    const fullUrl = buildFullUrl({ url, incomingHeaders: headersData });
    return fullUrl.toString();
  },

  async getHeaders({ search }: { search?: string | RegExp }): Promise<Headers> {
    const headersStore = await headers();

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of headersStore.entries()) {
      if (!search || !regex) filteredHeaders.append(key, value);
      else if (regex.test(key)) filteredHeaders.append(key, value);
    }

    return filteredHeaders;
  },

  async setHeaders({ headers, res }: { headers?: Headers; res?: NextResponse }) {
    if (!res) throw new Error("light-auth: Response object is required to set headers.");

    if (!headers || headers.entries().next().done) return res;

    for (const [key, value] of headers.entries()) res.headers.set(key, value);

    return res;
  },
};
