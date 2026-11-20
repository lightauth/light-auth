import { describe, expect, it } from "vitest";
import { getClientIp, isLocalIp, isValidIp, isValidLocalIp, isValidPublicIp } from "../src";

describe("getClientIp", () => {
  it.each<[Record<string, string>, string | null]>([
    [{ "x-forwarded-for": "203.0.113.7" }, "203.0.113.7"],
    [{ "x-forwarded-for": "1.1.1.1, 10.0.0.1, 203.0.113.7" }, "203.0.113.7"],
    [{ "x-forwarded-for": "203.0.113.7:51234" }, "203.0.113.7"],
    [{ "x-forwarded-for": "[2001:db8::1]:443" }, "2001:db8::1"],
    [{ "x-real-ip": " 198.51.100.4 " }, "198.51.100.4"],
    [{ "x-forwarded-for": " , " , "x-real-ip": "198.51.100.4" }, "198.51.100.4"],
    [{ host: "app.example" }, null],
  ])("reads %j as %s", (headers, expected) => {
    expect(getClientIp(new Headers(headers))).toBe(expected);
  });
});

describe("isLocalIp", () => {
  it.each(["127.0.0.1", "127.5.6.7", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.10.10", "::1", "fd12:3456::1", "fc00::1", "fe80::1", "FE80::1", "::ffff:10.0.0.1", "::ffff:127.0.0.1"])(
    "%s is local",
    (ip) => {
      expect(isLocalIp(ip)).toBe(true);
    }
  );

  it.each(["8.8.8.8", "172.32.0.1", "172.15.0.1", "2001:db8::1", "fd::1", "fec0::1", "::ffff:8.8.8.8"])("%s is not local", (ip) => {
    expect(isLocalIp(ip)).toBe(false);
  });
});

describe("isValidIp", () => {
  it.each(["0.0.0.0", "8.8.8.8", "255.255.255.255", "::1", "2001:db8::8a2e:370:7334", "::ffff:192.0.2.1"])("%s is valid", (ip) => {
    expect(isValidIp(ip)).toBe(true);
  });

  it.each(["", "hello", "not-an-ip:", "1.2.3", "256.1.1.1", "01.2.3.4", "1.2.3.4.5", "2001:db8:::1", "[::1]", "fe80::1%eth0", "gggg::1"])("%j is invalid", (ip) => {
    expect(isValidIp(ip)).toBe(false);
  });

  it("separates valid local and public addresses", () => {
    expect(isValidLocalIp("192.168.1.1")).toBe(true);
    expect(isValidLocalIp("192.168.1.999")).toBe(false);
    expect(isValidPublicIp("8.8.8.8")).toBe(true);
    expect(isValidPublicIp("10.0.0.1")).toBe(false);
  });
});
