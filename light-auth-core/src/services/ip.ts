/**
 * this function is used to get the client IP address from the request headers.
 * @param headers - The headers from the request.
 * @returns The client IP address or null if not found.
 */
export function getClientIp(headers: Headers): string | null {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, we take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const remoteAddress = headers.get("x-real-ip") || headers.get("remote-addr");
  if (remoteAddress) {
    return remoteAddress.trim();
  }

  // Fallback to the connection's remote address
  return headers.get("host") || null;
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
