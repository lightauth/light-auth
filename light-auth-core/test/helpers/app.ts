import { vi } from "vitest";
import {
  buildSecret,
  createCsrfToken,
  createHttpHandlerFunction,
  createLightAuthSessionStore,
  createOAuth2Provider,
  CSRF_COOKIE_NAME,
  decryptJwt,
  encryptJwt,
  type LightAuthConfig,
  type LightAuthCookie,
  type LightAuthRouter,
  type LightAuthSession,
  type LightAuthUser,
  type LightAuthUserAdapter,
} from "../../src";

export const TEST_SECRET = "test-secret-".repeat(4);
export const APP_ORIGIN = "https://app.example";
export const DAY_MS = 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_MS = 30 * DAY_MS;

export const secretKey = () => buildSecret({ LIGHT_AUTH_SECRET_VALUE: TEST_SECRET });

function parseCookieHeader(header: string | null | undefined): LightAuthCookie[] {
  return (header ?? "")
    .split(/;\s*/)
    .filter((part) => part.includes("="))
    .map((part) => ({ name: part.slice(0, part.indexOf("=")), value: decodeURIComponent(part.slice(part.indexOf("=") + 1)) }));
}

/**
 * Minimal router working on fetch Request / Response objects.
 * Cookies written with setCookies are recorded in writtenCookies.
 */
export function createTestRouter(writtenCookies: LightAuthCookie[]): LightAuthRouter {
  return {
    getRequest: ({ req }) => req as Request,
    getHeaders: ({ req }) => (req as Request | undefined)?.headers ?? new Headers(),
    getUrl: ({ req, endpoint }) => endpoint ?? (req as Request).url,
    getCookies: ({ req, search }) => {
      const cookies = parseCookieHeader((req as Request | undefined)?.headers.get("cookie"));
      const regex = typeof search === "string" ? new RegExp(search) : search;
      return regex ? cookies.filter((cookie) => regex.test(cookie.name)) : cookies;
    },
    setCookies: ({ cookies, res }) => {
      writtenCookies.push(...(cookies ?? []));
      return res as Response;
    },
    redirectTo: ({ url }) => new Response(null, { status: 302, headers: { Location: url } }),
    returnJson: ({ data, init }) => Response.json(data ?? null, { ...(init ?? {}), status: init?.status ?? 200 }),
  };
}

export function createMemoryUserAdapter(users: Map<string, LightAuthUser>): LightAuthUserAdapter {
  return {
    getUser: async ({ providerUserId }: { providerUserId: string | number }) => structuredClone(users.get(String(providerUserId))) ?? null,
    setUser: async ({ user }: { user: LightAuthUser }) => {
      users.set(String(user.providerUserId), structuredClone(user));
      return user;
    },
    deleteUser: async ({ user }: { user: LightAuthUser }) => {
      users.delete(String(user.providerUserId));
    },
  } as unknown as LightAuthUserAdapter;
}

export type CallResult = {
  /** Response returned by the light auth handler */
  response: Response | null;
  /** Response given to the session store, holding the session Set-Cookie header */
  res: Response;
  /** Error thrown by the handler */
  error?: string;
};

export type TestApp = ReturnType<typeof createTestApp>;

/**
 * Light auth application wired with the test router, the default cookie session store and an in-memory user adapter.
 */
export function createTestApp(overrides: Partial<LightAuthConfig> = {}) {
  const writtenCookies: LightAuthCookie[] = [];
  const users = new Map<string, LightAuthUser>();
  const errors: unknown[] = [];

  const config: LightAuthConfig = {
    env: { LIGHT_AUTH_SECRET_VALUE: TEST_SECRET, LIGHT_AUTH_URL: APP_ORIGIN },
    basePath: "/api/auth",
    providers: [
      createOAuth2Provider({
        providerName: "test",
        clientId: "test-client",
        clientSecret: "secret",
        authorizationEndpoint: "https://idp.test/authorize",
        tokenEndpoint: "https://idp.test/token",
      }),
    ],
    router: createTestRouter(writtenCookies),
    sessionStore: createLightAuthSessionStore(),
    userAdapter: createMemoryUserAdapter(users),
    onError: (error) => {
      errors.push(error);
    },
    ...overrides,
  };
  const handler = createHttpHandlerFunction(config);

  async function call(method: string, path: string, options: { cookie?: string; headers?: Record<string, string>; body?: string } = {}): Promise<CallResult> {
    const headers = new Headers(options.headers);
    if (options.cookie) headers.set("cookie", options.cookie);
    const req = new Request(`${APP_ORIGIN}${path}`, { method, headers, body: options.body });
    const res = new Response(null);
    writtenCookies.length = 0;
    try {
      const response = (await handler({ req, res })) as Response | null;
      return { response, res };
    } catch (error) {
      return { response: null, res, error: error instanceof Error ? error.message : String(error) };
    }
  }

  return { config, call, handler, users, errors, writtenCookies };
}

/** A session whose lifetime started ageDays ago */
export function sessionFixture(providerUserId: string, ageDays: number, overrides: Partial<LightAuthSession> & Record<string, unknown> = {}): LightAuthSession {
  return {
    id: `session-${providerUserId}`,
    providerUserId,
    email: `${providerUserId}@example.com`,
    name: providerUserId,
    providerName: "test",
    expiresAt: new Date(Date.now() - ageDays * DAY_MS + SESSION_MAX_AGE_MS),
    ...overrides,
  };
}

export async function sessionCookie(session: LightAuthSession | Record<string, unknown>): Promise<string> {
  return `light_auth_session=${await encryptJwt(session as Record<string, unknown>, secretKey())}`;
}

/** Decrypted session written by the session store, if any */
export async function readSessionCookie(res: Response): Promise<Record<string, unknown> | null> {
  const value = res.headers.get("set-cookie")?.match(/light_auth_session=([^;]+)/)?.[1];
  return value ? await decryptJwt(decodeURIComponent(value), secretKey()) : null;
}

export async function csrfFixture() {
  const { csrfToken, csrfTokenHash } = await createCsrfToken(secretKey());
  return { token: csrfToken, cookie: `${CSRF_COOKIE_NAME}=${csrfTokenHash}.${csrfToken}` };
}

/** Fails the test on any network access: light auth must work in-process */
export function forbidNetwork() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`unexpected network request to ${String(input instanceof Request ? input.url : input)}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
