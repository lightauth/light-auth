import type { LightAuthServerEnv } from "./light-auth-server-env";

export type LightAuthRateLimiter = {
  /**
   * method to check if the rate limit has been exceeded
   * @param args - The arguments for the rate limit function.
   * @returns A LightAuthRateLimitResponse if the rate limit is exceeded, otherwise undefined.
   * This function can be async or sync.
   * If it returns a response, it will be returned immediately and the request processing will stop.
   * If it returns undefined, the request will continue processing.
   */
  onRateLimit: (args: {
    env: LightAuthServerEnv;
    url: string;
    headers: Headers;
    basePath: string;
    [key: string]: unknown;
  }) => Promise<LightAuthRateLimitResponse | undefined> | LightAuthRateLimitResponse | undefined;
};

export type LightAuthRateLimit = {
  /**
   * The key to use for rate limiting
   */
  key: string;
  /**
   * The number of requests made
   */
  count: number;
  /**
   * The last request time in milliseconds
   */
  lastRequestDateTime: number;
};

export type LightAuthRateLimitResponse = {
  /**
   * The data to return in the response.
   */
  data: Record<string, unknown>;

  /**
   * response headers & status to return
   */
  init?: ResponseInit;
};

export type LightAuthRateLimitOptions = {
  /**
   * The time window in milliseconds for the rate limit.
   */
  timeWindowMs: number; // 1 sec
  /**
   * The maximum number of requests allowed per window.
   */
  maxRequestsPerTimeWindowsMs: number; // 100 requests per minute
  /**
   * The error message to return when the rate limit is exceeded.
   */
  errorMessage?: string | Record<string, unknown>;
  /**
   * The status code to return when the rate limit is exceeded.
   * This is a placeholder value and should be adjusted based on your application's needs.
   *
   * @default 429
   * */
  statusCode?: number;
  /**
   * A function to determine if the rate limit should be applied based on the request.
   * This function receives the request and can return true or false.
   * If it returns true, the rate limit will be applied.
   * If it returns false, the rate limit will not be applied.
   * This is a placeholder function and should be adjusted based on your application's needs.
   * @param args - The arguments for the rate limit function.
   *
   * @return A boolean indicating whether the rate limit should be applied.
   * */
  shouldApplyRateLimit?: (args: { env: LightAuthServerEnv; url: string; headers: Headers; basePath: string; [key: string]: unknown }) => boolean;
};
