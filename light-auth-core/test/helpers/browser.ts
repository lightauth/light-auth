import { vi } from "vitest";
import { APP_ORIGIN, type TestApp } from "./app";

/**
 * Minimal browser for the client functions: window.location, document.cookie backed by a cookie jar,
 * and fetch routed to the light auth handler, sending the cookies (HttpOnly ones included) like a browser does.
 */
export function createBrowser(app: TestApp) {
  const jar = new Map<string, { value: string; httpOnly: boolean }>();

  const storeCookie = (setCookie: string, fromServer: boolean) => {
    const [pair, ...attributes] = setCookie.split(";").map((part) => part.trim());
    const name = pair.slice(0, pair.indexOf("="));
    if (attributes.some((attribute) => /^max-age=0$/i.test(attribute))) {
      jar.delete(name);
      return;
    }
    jar.set(name, { value: pair.slice(pair.indexOf("=") + 1), httpOnly: fromServer && attributes.some((attribute) => /^httponly$/i.test(attribute)) });
  };
  const cookieHeader = () => [...jar].map(([name, cookie]) => `${name}=${cookie.value}`).join("; ");

  const document = {
    baseURI: `${APP_ORIGIN}/page`,
    // HttpOnly cookies are not visible from JavaScript
    get cookie() {
      return [...jar]
        .filter(([, cookie]) => !cookie.httpOnly)
        .map(([name, cookie]) => `${name}=${cookie.value}`)
        .join("; ");
    },
    set cookie(value: string) {
      storeCookie(value, false);
    },
  };
  const window = { location: { href: `${APP_ORIGIN}/page` }, document };

  const requests: Request[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request.clone());

    const headers = new Headers(request.headers);
    headers.set("host", new URL(request.url).host);
    if (request.method !== "GET") headers.set("origin", APP_ORIGIN);
    if (jar.size > 0) headers.set("cookie", cookieHeader());

    const res = new Response(null);
    const response = ((await app.handler({ req: new Request(request, { headers }), res })) as Response | null) ?? new Response(null, { status: 404 });
    for (const setCookie of res.headers.getSetCookie()) storeCookie(setCookie, true);
    return response;
  });

  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  vi.stubGlobal("fetch", fetchMock);

  return {
    window,
    document,
    jar,
    requests,
    cookieHeader,
    setServerCookie: (cookie: string) => storeCookie(`${cookie}; HttpOnly`, true),
  };
}
