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

const LOCAL_IPV4_RANGES = [
  /^127\./, // loopback (127.0.0.0/8)
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./, // link-local
];

export function isLocalIp(ip: string): boolean {
  const address = ip.trim().toLowerCase();

  // IPv4-mapped IPv6 address (::ffff:10.0.0.1)
  const mappedIpv4 = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (mappedIpv4) return isLocalIp(mappedIpv4);

  if (LOCAL_IPV4_RANGES.some((range) => range.test(address))) return true;

  // IPv6 loopback, unique local (fc00::/7) and link-local (fe80::/10) addresses
  return address === "::1" || /^f[cd][0-9a-f]{2}:/.test(address) || /^fe[89ab][0-9a-f]:/.test(address);
}

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;

function isIpv6(ip: string): boolean {
  if (!ip.includes(":") || !/^[0-9a-fA-F:.]+$/.test(ip)) return false;
  // the URL parser validates IPv6 literals, in every runtime
  try {
    new URL(`http://[${ip}]/`);
    return true;
  } catch {
    return false;
  }
}

export function isValidIp(ip: string): boolean {
  return IPV4_PATTERN.test(ip) || isIpv6(ip);
}
export function isValidLocalIp(ip: string): boolean {
  return isLocalIp(ip) && isValidIp(ip);
}
export function isValidPublicIp(ip: string): boolean {
  return !isLocalIp(ip) && isValidIp(ip);
}
