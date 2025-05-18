import { DEFAULT_BASE_PATH, DEFAULT_SESSION_EXPIRATION, INTERNAL_SECRET_VALUE } from "../constants";
import { LightAuthProvider, LightAuthConfig } from "../models";
import { LightAuthConfigClient } from "../client";

/**
 * Checks the configuration and throws an error if any required fields are missing.
 * @param config The configuration object to check.
 * @returns The checked configuration object.
 * @throws Error if any required fields are missing.
 */
export function checkConfig(config: LightAuthConfig, providerName?: string): Required<LightAuthConfig> & { provider: LightAuthProvider } {
  if (!config.env) throw new Error("light-auth: env is required");
  if (!config.env["LIGHT_AUTH_SECRET_VALUE"]) {
    throw new Error("LIGHT_AUTH_SECRET_VALUE is required in environment variables");
  }
  if (!Array.isArray(config.providers) || config.providers.length === 0) throw new Error("light-auth: At least one provider is required");
  if (config.router == null) throw new Error("light-auth: router is required");
  if (config.sessionStore == null) throw new Error("light-auth: sessionStore is required");

  // if providerName is provider, check if the provider is in the config
  if (providerName && !config.providers.some((p) => p.providerName.toLocaleLowerCase() == providerName.toLocaleLowerCase()))
    throw new Error(`light-auth: Provider ${providerName} not found`);

  const provider = !providerName ? config.providers[0] : config.providers.find((p) => p.providerName.toLocaleLowerCase() == providerName.toLocaleLowerCase());
  if (!provider) throw new Error(`light-auth: Provider ${providerName} not found`);

  return {
    ...(config as Required<LightAuthConfig>),
    provider,
  };
}

/** get the max age from the environment variable or use the default value */
export function getSessionExpirationMaxAge() {
  let maxAge = process.env.LIGHT_AUTH_SESSION_EXPIRATION ? parseInt(process.env.LIGHT_AUTH_SESSION_EXPIRATION, 10) : DEFAULT_SESSION_EXPIRATION;
  if (isNaN(maxAge) || maxAge <= 0) maxAge = DEFAULT_SESSION_EXPIRATION; // Fallback if invalid
  return maxAge;
}

/** Resolves the basePath, defaults to "/api/default" if not provided or falsy */
export function resolveBasePath(config?: LightAuthConfig | LightAuthConfigClient): string {
  let resolvedBasePath = config?.basePath || config?.env?.["LIGHT_AUTH_BASE_PATH"] || DEFAULT_BASE_PATH;

  if (!resolvedBasePath.startsWith("/")) resolvedBasePath = `/${resolvedBasePath}`;

  // Ensure the base path does not end with "/"
  if (resolvedBasePath.endsWith("/")) resolvedBasePath = resolvedBasePath.slice(0, -1);

  // Ensure the base path does not contain double slashes
  if (resolvedBasePath.includes("//")) resolvedBasePath = resolvedBasePath.replace(/\/\//g, "/");

  return resolvedBasePath;
}

export function buildSecret(env?: { [key: string]: string | undefined }): string {
  if (!env) throw new Error("light-auth: config.env is required");
  if (!env.LIGHT_AUTH_SECRET_VALUE) throw new Error("light-auth: environment variable LIGHT_AUTH_SECRET_VALUE is required");

  const secret = (env.LIGHT_AUTH_SECRET_VALUE + INTERNAL_SECRET_VALUE).slice(0, 32);

  if (secret.length < 32) throw new Error("light-auth: secret must be at least 32 characters long");
  return secret;
}

export function buildFullUrl({ url, incomingHeaders }: { url: string; incomingHeaders: Headers }): string {
  if (url.startsWith("http")) return new URL(url).toString();
  let reqHost = incomingHeaders?.get("host") ?? incomingHeaders?.get("x-forwarded-host");

  const isServerSide = typeof window === "undefined";

  // If the host is not present or not on server side, return the url as is
  if (!reqHost || !isServerSide) return url;

  // build the full url from the url and the host
  const sanitizedEndpoint = url.startsWith("/") ? url : `/${url}`;
  let protocol = "http";

  // Prefer x-forwarded-proto headers for protocol
  const xfp = incomingHeaders?.get("x-forwarded-proto") || incomingHeaders?.get("x-forwarded-protocol");
  if (xfp && xfp.split(",")[0].trim() === "https") {
    protocol = "https";
  } else {
    // TODO : forward env
    // protocol = env["NODE_ENV"] === "production" ? "https" : "http";
  }
  //TODO : if x-forwarded-host is not present, check if we are in production or not

  const host: string = reqHost ?? "localhost:3000";

  const sanitizedHost = host.endsWith("/") ? host.slice(0, -1) : host;
  return new URL(sanitizedEndpoint, `${protocol}://${sanitizedHost}`).toString();
}
