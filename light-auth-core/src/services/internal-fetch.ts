import { LightAuthConfig } from "../models";

/**
 * this function is used to make a request to the light auth server
 * it can be done from the server side or the client side
 *
 * it will use the router to get the url and the headers (if server side)
 */
export async function internalFetch<T extends Record<string, any> | string | Blob>(args: {
  config: LightAuthConfig<any, any>;
  endpoint: string;
  method: string;
  body?: any;
  [key: string]: unknown;
}): Promise<T | null | undefined> {
  const { config, body, method = "GET" } = args;
  const { router } = config;

  // check if we are on the server side or client side
  // if we are on the server side, we need to use the router to get the url and headers
  // if we are on the client side, we can use the window object to get the url and headers
  const isServerSide = typeof window === "undefined";

  const bodyBytes = body ? new TextEncoder().encode(body.toString()) : undefined;

  // get all the headers from the request
  let requestHeaders: Headers | null = null;

  if (router && isServerSide) requestHeaders = await router.getHeaders(args);

  // get the full url from the router if available
  let url = args.endpoint;
  if (router && isServerSide) url = await router.getUrl(args);

  const request = bodyBytes
    ? new Request(url.toString(), { method: method, headers: requestHeaders ?? new Headers(), body: bodyBytes })
    : new Request(url.toString(), { method: method, headers: requestHeaders ?? new Headers() });

  let response: Response | null = null;

  try {
    response = await fetch(request);
  } catch (error) {
    console.error("Error:", error);
    throw new Error(`light-auth: Request failed with error ${error}`);
  }
  if (!response || !response.ok) {
    throw new Error(`light-auth: Request failed with status ${response?.status}`);
  }
  const contentType = response.headers.get("Content-Type");

  if (contentType && contentType.includes("application/x-www-form-urlencoded")) {
    const formResponse = await response.text();
    const formData = new URLSearchParams(formResponse);
    const result: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      result[key] = value;
    }
    return result as T;
  }
  if (contentType && (contentType.includes("application/json") || contentType.includes("text/plain"))) {
    const jsonResponse = await response.json();
    return jsonResponse as T;
  }
  if (contentType && contentType.includes("application/octet-stream")) {
    const blobResponse = await response.blob();
    return blobResponse as T;
  }
  return null;
}
