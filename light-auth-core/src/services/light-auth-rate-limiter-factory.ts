import type { LightAuthServerEnv } from "../models";
import type { LightAuthRateLimit, LightAuthRateLimiter, LightAuthRateLimitOptions } from "../models/light-auth-rate-limit";
import { getClientIp } from "./ip";

const defaultOptions: Required<Omit<LightAuthRateLimitOptions, "keyGenerator">> = {
  maxRequestsPerTimeWindowsMs: 10,
  timeWindowMs: 1000, // 1 sec
  errorMessage: "Too many requests. Please try again later.",
  statusCode: 429,
  shouldApplyRateLimit: () => true, // Default to always apply rate limit
};

export const createLightAuthRateLimiter = (opt: LightAuthRateLimitOptions | undefined = defaultOptions): LightAuthRateLimiter => {
  // counters are scoped to this limiter instance
  const memory = new Map<string, LightAuthRateLimit>();
  let lastCleanupDateTime = Date.now();

  return {
    async onRateLimit(args) {
      const { url, headers } = args;

      // by default, we apply the rate limit unless the function exists and returns false
      if (opt.shouldApplyRateLimit && !opt.shouldApplyRateLimit(args)) {
        return undefined; // Skip rate limiting if the function returns false
      }

      // Get the current time and the rate limit data from memory
      const now = Date.now();
      const timeWindowMs = opt.timeWindowMs || defaultOptions.timeWindowMs;

      // drop expired counters so that the map cannot grow forever
      if (now - lastCleanupDateTime > timeWindowMs) {
        for (const [key, entry] of memory) if (entry.lastRequestDateTime + timeWindowMs < now) memory.delete(key);
        lastCleanupDateTime = now;
      }

      // the query string is ignored, otherwise every "?n=<random>" variant would get its own counter
      let pathname = url;
      try {
        pathname = new URL(url).pathname;
      } catch {}

      // define the key for the rate limit based on the client and the request path
      const clientKey = opt.keyGenerator ? await opt.keyGenerator(args) : getClientIp(headers) ?? "unknown";
      const rateLimitKey = `${clientKey}__${pathname}`;

      const rateLimit = memory.get(rateLimitKey) || {
        key: rateLimitKey,
        count: 0,
        lastRequestDateTime: now,
      };

      // a new time window starts once the previous one is over, the current request is counted in it below
      if (rateLimit.lastRequestDateTime + timeWindowMs < now) {
        rateLimit.count = 0;
        rateLimit.lastRequestDateTime = now;
      }

      // get the time window and max requests per time window from options or use defaults
      const maxRequestsPerTimeWindowsMs = opt.maxRequestsPerTimeWindowsMs || defaultOptions.maxRequestsPerTimeWindowsMs;

      // the retryAfter defines how long the client should wait before making another request
      const retryAfter = rateLimit.lastRequestDateTime + timeWindowMs - now;

      // Check if the rate limit has been exceeded
      const isRateLimitExceeded = rateLimit.count >= maxRequestsPerTimeWindowsMs && now - rateLimit.lastRequestDateTime < timeWindowMs;

      // If the last request was made within the time window, increment the count
      if (!isRateLimitExceeded) {
        rateLimit.count += 1;
        rateLimit.lastRequestDateTime = now;
        memory.set(rateLimitKey, rateLimit);
        return undefined; // No rate limit exceeded, continue processing the request
      }

      // If the rate limit is exceeded, return a response
      const data =
        typeof opt.errorMessage === "string"
          ? { message: opt.errorMessage ?? defaultOptions.errorMessage }
          : opt.errorMessage ?? { message: defaultOptions.errorMessage };

      return {
        data: data,
        init: {
          status: opt.statusCode || defaultOptions.statusCode,
          statusText: "Too Many Requests",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(JSON.stringify(data)).toString(),
            "Retry-After": Math.ceil(retryAfter / 1000).toString(),
            "X-Retry-After": Math.ceil(retryAfter / 1000).toString(),
          },
        },
      };
    },
  };
};
