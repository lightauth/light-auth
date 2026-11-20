/**
 * this function is used to get the client IP address from the proxy headers.
 * The left-most x-forwarded-for entries are sent by the client and can be spoofed: the right-most one, appended by the closest proxy, is used instead.
 * Without a trusted reverse proxy these headers are entirely client-controlled: use the rate limiter keyGenerator option in that case.
 * @param headers - The headers from the request.
 * @returns The client IP address or null if not found.
 */
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((ip) => ip.trim())
    .filter((ip) => ip !== "");
  if (forwardedFor && forwardedFor.length > 0) return stripPort(forwardedFor[forwardedFor.length - 1]);

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) return stripPort(realIp);

  return null;
}

// some proxies (Azure App Service for instance) append the client port, which changes on every connection
function stripPort(ip: string): string {
  const bracketedIpv6 = ip.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6) return bracketedIpv6[1];
  const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) return ipv4WithPort[1];
  return ip;
}

export function isLocalIp(ip: string): boolean {
  // Check if the IP is a loopback address
  if (ip === "127.0.1" || ip === "::1") {
    return true;
  }
  // Check if the IP is in the private IP ranges
  const privateIpRanges = [
    /^10\./, //
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, //
    /^192\.168\./, //
    /^169\.254\./, // Link-local addresses
    /^fc00:/, // Unique local addresses (ULA)
    /^fe80:/, // Link-local addresses in IPv6
    /^::1$/, // IPv6 loopback address
    /^::ffff:127\.0\.0\.1$/, // IPv6 representation of IPv4 loopback
    /^::ffff:0:0:0:1$/, // IPv6 representation of IPv4 loopback
  ];
  return privateIpRanges.some((range) => range.test(ip));
}

export function isValidIp(ip: string): boolean {
  // Simple regex to validate IPv4 and IPv6 addresses
  const ipv4Pattern =
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Pattern =
    /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:(:[0-9a-fA-F]{1,4}){7}|:|::/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}
export function isValidLocalIp(ip: string): boolean {
  return isLocalIp(ip) && isValidIp(ip);
}
export function isValidPublicIp(ip: string): boolean {
  return !isLocalIp(ip) && isValidIp(ip);
}
