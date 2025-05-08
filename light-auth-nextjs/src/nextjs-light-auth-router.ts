import { buildFullUrl, LightAuthRouter } from "@light-auth/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthRouter: LightAuthRouter = {
  writeJson({ data }: { data: {} | null }): NextResponse {
    return NextResponse.json(data);
  },

  async redirectTo({ url, req }: { url: string; req?: NextRequest }): Promise<NextResponse> {
    const fullUrl = req ? buildFullUrl({ endpoint: url, req }) : url;
    console.log("Redirecting to:", url, fullUrl.toString());
    return redirect(fullUrl.toString());
  },

  async getUrl({ endpoint, req }: { endpoint?: string; req?: NextRequest }) {
    let url = endpoint;
    if (!url) url = req?.url;

    if (!url) {
      throw new Error("light-auth: No url provided and no request object available in getUrl of nextJsLightAuthRouter.");
    }

    if (url.startsWith("http")) return url;

    const headersData = await headers();

    const sanitizedEndpoint = url.startsWith("/") ? url : `/${url}`;
    const reqHost = headersData.get("host");
    const host: string = reqHost ?? "localhost:3000"; // TODO : replace with env variable

    // Check if we are on https
    let protocol = "http";
    if (
      headersData.get("x-forwarded-proto") === "https" ||
      headersData.get("x-forwarded-protocol") === "https" ||
      headersData.get("x-forwarded-proto")?.split(",")[0] === "https"
    ) {
      protocol = "https";
    }
    const sanitizedHost = host.endsWith("/") ? host.slice(0, -1) : host;
    return new URL(sanitizedEndpoint, `${protocol}://${sanitizedHost}`).toString();
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
      else if (regex.test(key)) {
        filteredHeaders.append(key, value);
      }
    }

    return filteredHeaders;
  },
  async setHeaders({ headers }: { headers: Map<string, string> }): Promise<void> {
    console.warn("setHeaders can't be done in nextjs.");
    return;
  },
};
