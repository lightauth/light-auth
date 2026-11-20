import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLightAuthRateLimiter, type LightAuthRateLimiter } from "../src";

const LOGIN_URL = "https://app.example/api/auth/credentials/login";

async function isLimited(limiter: LightAuthRateLimiter, url: string, headers: Record<string, string> = {}) {
  return !!(await limiter.onRateLimit({ env: {}, basePath: "/api/auth", url, headers: new Headers(headers) }));
}

async function hits(limiter: LightAuthRateLimiter, count: number, request: (i: number) => [string, Record<string, string>]) {
  const results: boolean[] = [];
  for (let i = 0; i < count; i++) results.push(await isLimited(limiter, ...request(i)));
  return results;
}

const limiter = () => createLightAuthRateLimiter({ maxRequestsPerTimeWindowsMs: 3, timeWindowMs: 60_000 });
const LIMITED_AFTER_3 = [false, false, false, true, true, true];

describe("rate limiter", () => {
  it("blocks a client after the allowed number of requests", async () => {
    expect(await hits(limiter(), 6, () => [LOGIN_URL, { "x-forwarded-for": "9.9.9.9" }])).toEqual(LIMITED_AFTER_3);
  });

  it("ignores the query string", async () => {
    expect(await hits(limiter(), 6, (i) => [`${LOGIN_URL}?n=${i}`, { "x-forwarded-for": "9.9.9.9" }])).toEqual(LIMITED_AFTER_3);
  });

  it("ignores the x-forwarded-for entries sent by the client", async () => {
    expect(await hits(limiter(), 6, (i) => [LOGIN_URL, { "x-forwarded-for": `1.1.1.${i}, 8.8.8.8` }])).toEqual(LIMITED_AFTER_3);
  });

  it("strips the client port appended by some proxies", async () => {
    expect(await hits(limiter(), 6, (i) => [LOGIN_URL, { "x-forwarded-for": `8.8.8.8:${1000 + i}` }])).toEqual(LIMITED_AFTER_3);
  });

  it("counts each client separately", async () => {
    const shared = limiter();
    await hits(shared, 3, () => [LOGIN_URL, { "x-forwarded-for": "8.8.8.8" }]);
    expect(await isLimited(shared, LOGIN_URL, { "x-forwarded-for": "8.8.8.8" })).toBe(true);
    expect(await isLimited(shared, LOGIN_URL, { "x-forwarded-for": "7.7.7.7" })).toBe(false);
  });

  it("uses the keyGenerator option to identify the client", async () => {
    const custom = createLightAuthRateLimiter({ maxRequestsPerTimeWindowsMs: 1, timeWindowMs: 60_000, keyGenerator: () => "same-client" });
    expect(await hits(custom, 3, (i) => [LOGIN_URL, { "x-forwarded-for": `1.1.1.${i}` }])).toEqual([false, true, true]);
  });

  it("keeps the counters of each limiter instance separate", async () => {
    const first = limiter();
    await hits(first, 3, () => [LOGIN_URL, { "x-real-ip": "6.6.6.6" }]);
    expect(await isLimited(first, LOGIN_URL, { "x-real-ip": "6.6.6.6" })).toBe(true);
    expect(await isLimited(limiter(), LOGIN_URL, { "x-real-ip": "6.6.6.6" })).toBe(false);
  });

  it("answers with a 429 and a Retry-After header", async () => {
    const blocking = limiter();
    await hits(blocking, 3, () => [LOGIN_URL, {}]);
    const response = await blocking.onRateLimit({ env: {}, basePath: "/api/auth", url: LOGIN_URL, headers: new Headers() });
    expect(response?.init?.status).toBe(429);
    expect((response?.init?.headers as Record<string, string>)["Retry-After"]).toMatch(/^\d+$/);
  });

  it("skips the requests excluded by shouldApplyRateLimit", async () => {
    const selective = createLightAuthRateLimiter({ maxRequestsPerTimeWindowsMs: 1, timeWindowMs: 60_000, shouldApplyRateLimit: ({ url }) => url.includes("/credentials/") });
    expect(await hits(selective, 3, () => ["https://app.example/api/auth/session", {}])).toEqual([false, false, false]);
    expect(await hits(selective, 2, () => [LOGIN_URL, {}])).toEqual([false, true]);
  });

  it("answers the configured error message and status", async () => {
    const custom = createLightAuthRateLimiter({ maxRequestsPerTimeWindowsMs: 1, timeWindowMs: 60_000, errorMessage: { code: "slow_down" }, statusCode: 503 });
    await hits(custom, 1, () => [LOGIN_URL, {}]);
    const response = await custom.onRateLimit({ env: {}, basePath: "/api/auth", url: LOGIN_URL, headers: new Headers() });
    expect(response).toMatchObject({ data: { code: "slow_down" }, init: { status: 503 } });
  });

  describe("time window", () => {
    const client = { "x-real-ip": "5.5.5.5" };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("lets a blocked client in again once its time window is over", async () => {
      const blocking = limiter();
      expect(await hits(blocking, 4, () => [LOGIN_URL, client])).toEqual([false, false, false, true]);
      vi.advanceTimersByTime(60_001);
      expect(await hits(blocking, 4, () => [LOGIN_URL, client])).toEqual([false, false, false, true]);
    });

    it("allows exactly the configured number of requests in the following time window", async () => {
      const blocking = limiter();
      vi.advanceTimersByTime(40_000);
      await hits(blocking, 4, () => [LOGIN_URL, client]);
      // another client triggers the cleanup while the window of 5.5.5.5 is still running, so its counter is reset rather than deleted
      vi.advanceTimersByTime(30_000);
      await isLimited(blocking, LOGIN_URL, { "x-real-ip": "4.4.4.4" });
      vi.advanceTimersByTime(30_001);
      expect(await hits(blocking, 4, () => [LOGIN_URL, client])).toEqual([false, false, false, true]);
    });

    it("allows 10 requests per second by default", async () => {
      const defaults = createLightAuthRateLimiter();
      expect(await hits(defaults, 11, () => [LOGIN_URL, {}])).toEqual([...Array(10).fill(false), true]);
      vi.advanceTimersByTime(1_001);
      expect(await isLimited(defaults, LOGIN_URL)).toBe(false);
    });
  });
});
