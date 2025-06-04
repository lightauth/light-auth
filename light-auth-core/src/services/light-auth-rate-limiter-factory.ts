import type { LightAuthServerEnv } from "../models";
import type { LightAuthRateLimit, LightAuthRateLimiter, LightAuthRateLimitOptions } from "../models/light-auth-rate-limit";
import { getClientIp } from "./ip";

const defaultOptions: Required<LightAuthRateLimitOptions> = {
  maxRequestsPerTimeWindowsMs: 10,
  timeWindowMs: 1000, // 1 sec
  errorMessage: "Too many requests. Please try again later.",
  statusCode: 429,
  shouldApplyRateLimit: () => true, // Default to always apply rate limit
};

const memory = new Map<string, LightAuthRateLimit>();

export const createLightAuthRateLimiter = (opt: LightAuthRateLimitOptions | undefined = defaultOptions): LightAuthRateLimiter => {
  return {
    onRateLimit(args) {
      const { url, headers } = args;

      // define the key for the rate limit based on the request IP and URL
      const rateLimitKey = `${getClientIp(headers)}__${url}`;

      // by default, we apply the rate limit unless the function exists and returns false
      if (opt.shouldApplyRateLimit && !opt.shouldApplyRateLimit(args)) {
        return undefined; // Skip rate limiting if the function returns false
      }

      // Get the current time and the rate limit data from memory
      const now = Date.now();
      const rateLimit = memory.get(rateLimitKey) || {
        key: rateLimitKey,
        count: 0,
        lastRequestDateTime: now,
      };

      const timeWindowMs = opt.timeWindowMs || defaultOptions.timeWindowMs;

      // check if we have already over the time window limit
      if (rateLimit.lastRequestDateTime + timeWindowMs < now) {
        // Reset the count if the last request was made outside the time window
        rateLimit.count = 0;
        rateLimit.lastRequestDateTime = now;
        memory.set(rateLimitKey, rateLimit);
        return undefined; // No rate limit exceeded, continue processing the request
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
            "X-Retry-After": Math.ceil(retryAfter / 1000).toString(),
          },
        },
      };
    },
  };
};
