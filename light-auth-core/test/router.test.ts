import { beforeEach, describe, expect, it } from "vitest";
import { createLightAuthRouter, createOAuth2Provider, CSRF_TOKEN_PARAM_NAME } from "../src";
import { createTestApp, csrfFixture, forbidNetwork } from "./helpers/app";

const env = {};
const basePath = "/api/auth";

describe("default fetch router", () => {
  const router = createLightAuthRouter();

  it("redirects with a Location header", async () => {
    const response = (await router.redirectTo({ env, basePath, url: "https://idp.example/authorize" })) as Response;
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://idp.example/authorize");
  });

  it("appends every cookie to the response given by the caller", async () => {
    const res = new Response(null);
    const returned = await router.setCookies({
      env,
      basePath,
      res,
      cookies: [
        { name: "a", value: "1", path: "/", httpOnly: true, sameSite: "lax", maxAge: 600 },
        { name: "b", value: "", path: "/", maxAge: 0 },
      ],
    });
    expect(returned).toBe(res);
    expect(res.headers.getSetCookie()).toEqual(["a=1; Max-Age=600; Path=/; HttpOnly; SameSite=Lax", "b=; Max-Age=0; Path=/"]);
  });

  it("creates a response for the cookies when the caller gives none", async () => {
    const response = (await router.setCookies({ env, basePath, cookies: [{ name: "a", value: "1" }] })) as Response;
    expect(response.headers.getSetCookie()).toEqual(["a=1"]);
  });

  it("carries the cookies set on the caller response to the redirect and JSON responses", async () => {
    const res = new Response(null);
    res.headers.append("Set-Cookie", "light_auth_session=abc; Path=/; HttpOnly");

    const redirect = (await router.redirectTo({ env, basePath, url: "/", res })) as Response;
    const json = (await router.returnJson({ env, basePath, data: { ok: true }, res })) as Response;
    expect(redirect.headers.getSetCookie()).toEqual(["light_auth_session=abc; Path=/; HttpOnly"]);
    expect(json.headers.getSetCookie()).toEqual(["light_auth_session=abc; Path=/; HttpOnly"]);
  });

  it("returns null as a JSON body", async () => {
    const response = (await router.returnJson({ env, basePath, data: null })) as Response;
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toBeNull();
  });

  it("returns JSON with the given status", async () => {
    const response = (await router.returnJson({ env, basePath, data: { error: "Forbidden" }, init: { status: 403 } })) as Response;
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Forbidden" });
  });

  it("filters the request cookies and headers", async () => {
    const req = new Request("https://app.example/", { headers: { cookie: "google_light_auth_state=s; other=o", "x-forwarded-proto": "https", accept: "*/*" } });
    expect(await router.getCookies({ env, basePath, req, search: /^google_light_auth_/ })).toEqual([{ name: "google_light_auth_state", value: "s" }]);
    expect(await router.getCookies({ env, basePath, req: new Request("https://app.example/") })).toEqual([]);
    expect([...(await router.getHeaders({ env, basePath, req, search: "^x-forwarded" })).keys()]).toEqual(["x-forwarded-proto"]);
    expect([...(await router.getHeaders({ env, basePath })).keys()]).toEqual([]);
  });

  it("builds absolute URLs and requires a request", async () => {
    const req = new Request("https://app.example/api/auth/session", { headers: { host: "app.example", "x-forwarded-proto": "https" } });
    expect(await router.getUrl({ env, basePath, req })).toBe("https://app.example/api/auth/session");
    expect(await router.getUrl({ env, basePath, req, endpoint: "/api/auth/user" })).toBe("https://app.example/api/auth/user");
    expect(() => router.getUrl({ env, basePath })).toThrow(/No url provided/);
    expect(() => router.getRequest({ env, basePath })).toThrow(/No request object/);
  });
});

describe("light auth with the default fetch router", () => {
  beforeEach(() => {
    forbidNetwork();
  });

  it("returns the OAuth flow cookies with the redirect to the provider", async () => {
    const app = createTestApp({
      router: createLightAuthRouter(),
      providers: [
        createOAuth2Provider({
          providerName: "test",
          clientId: "id",
          clientSecret: "secret",
          authorizationEndpoint: "https://idp.test/authorize",
          tokenEndpoint: "https://idp.test/token",
        }),
      ],
    });
    const csrf = await csrfFixture();
    const { response } = await app.call("GET", `/api/auth/login/test?${CSRF_TOKEN_PARAM_NAME}=${csrf.token}`, { cookie: csrf.cookie });

    expect(response?.status).toBe(302);
    expect(response?.headers.get("location")).toMatch(/^https:\/\/idp\.test\/authorize\?/);
    const cookieNames = response?.headers.getSetCookie().map((cookie) => cookie.split("=")[0]);
    expect(cookieNames).toEqual(expect.arrayContaining(["test_light_auth_state", "test_light_auth_code_verifier", "test_light_auth_callback_url", "light_auth_csrf_token"]));
  });

  it("answers null as JSON when there is no session", async () => {
    const { response } = await createTestApp({ router: createLightAuthRouter() }).call("POST", "/api/auth/session");
    expect(await response?.json()).toBeNull();
  });
});
