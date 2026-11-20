import { describe, expect, it } from "vitest";
import { createCsrfToken, CSRF_COOKIE_NAME, validateCsrfToken } from "../src";
import { secretKey } from "./helpers/app";

const csrfCookie = (value: string) => [{ name: CSRF_COOKIE_NAME, value }];

describe("CSRF double-submit token", () => {
  it("accepts the token sent back with the request when it matches the signed cookie", async () => {
    const { csrfToken, csrfTokenHash } = await createCsrfToken(secretKey());
    expect(await validateCsrfToken(csrfCookie(`${csrfTokenHash}.${csrfToken}`), secretKey(), csrfToken)).toBe(true);
  });

  it("rejects a request carrying the cookie only (the browser sends it cross-site)", async () => {
    const { csrfToken, csrfTokenHash } = await createCsrfToken(secretKey());
    expect(await validateCsrfToken(csrfCookie(`${csrfTokenHash}.${csrfToken}`), secretKey(), null)).toBe(false);
  });

  it("rejects a token that does not match the cookie", async () => {
    const victim = await createCsrfToken(secretKey());
    const attacker = await createCsrfToken(secretKey());
    expect(await validateCsrfToken(csrfCookie(`${victim.csrfTokenHash}.${victim.csrfToken}`), secretKey(), attacker.csrfToken)).toBe(false);
  });

  it("rejects an unsigned cookie chosen by the attacker", async () => {
    expect(await validateCsrfToken(csrfCookie("forged-signature.attacker-token"), secretKey(), "attacker-token")).toBe(false);
  });

  it("rejects a cookie signed with another secret", async () => {
    const { csrfToken, csrfTokenHash } = await createCsrfToken("another-secret-value-".repeat(2));
    expect(await validateCsrfToken(csrfCookie(`${csrfTokenHash}.${csrfToken}`), secretKey(), csrfToken)).toBe(false);
  });

  it("rejects a request without CSRF cookie", async () => {
    expect(await validateCsrfToken([], secretKey(), "token")).toBe(false);
  });

  it("generates a new random token each time", async () => {
    const first = await createCsrfToken(secretKey());
    const second = await createCsrfToken(secretKey());
    expect(first.csrfToken).not.toBe(second.csrfToken);
    expect(first.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
