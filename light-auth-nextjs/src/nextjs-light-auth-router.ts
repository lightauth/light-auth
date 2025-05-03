import { LightAuthRouter } from "@light-auth/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

/**
 * A concrete CookieStore implementation for Node.js server-side,
 * using the 'cookie' npm package and returning Response objects
 * with appropriate Set-Cookie headers.
 */
export const nextJsLightAuthRouter: LightAuthRouter = {
  writeJson({ res, data }: { res?: NextResponse; data: any }): NextResponse {
    if (!res) throw new Error("Response is required in writeJson function of nextJsLightAuthRouter");

    return NextResponse.json(data);
  },

  async redirectTo({ url }: { url: string }) {
    redirect(url);
  },

  async getUrl({ req }: { req?: NextRequest }) {
    if (!req) throw new Error("Request is required in nextJsLightAuthRouter");

    const url = new URL(req.url);
    return url;
  },

  async getHeaders({ search }: { search: string | RegExp }): Promise<Headers> {
    const headersStore = await headers();

    // Convert search to RegExp if it's a string
    const regex = typeof search === "string" ? new RegExp(search) : search;

    // Create a new Headers object to hold filtered headers
    const filteredHeaders = new Headers();

    // Iterate and filter headers whose names match the regex
    for (const [key, value] of headersStore.entries()) {
      if (regex.test(key)) {
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
