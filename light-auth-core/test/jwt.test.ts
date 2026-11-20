import { describe, expect, it } from "vitest";
import { decryptJwt, encryptJwt } from "../src";
import { secretKey } from "./helpers/app";

describe("session JWE", () => {
  it("mirrors expiresAt in the exp claim", async () => {
    const expiresAt = new Date(Date.now() + 3600_000);
    const payload = await decryptJwt(await encryptJwt({ id: "1", expiresAt }, secretKey()), secretKey());
    expect(payload.exp).toBe(Math.floor(expiresAt.getTime() / 1000));
  });

  it("rejects an expired token without exposing its payload", async () => {
    const token = await encryptJwt({ email: "ada@example.com", expiresAt: new Date(Date.now() - 1000) }, secretKey());
    const error = await decryptJwt(token, secretKey()).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("light-auth: token expired");
    expect(Object.keys(error as object)).not.toContain("payload");
    expect((error as Error).cause).toBeUndefined();
  });

  it("does not add an exp claim to payloads without expiresAt (stored users)", async () => {
    const payload = await decryptJwt(await encryptJwt({ providerUserId: "1" }, secretKey()), secretKey());
    expect(payload.exp).toBeUndefined();
  });

  it("rejects a token encrypted with another secret", async () => {
    const token = await encryptJwt({ id: "1" }, "another-secret-value-12345678901");
    await expect(decryptJwt(token, secretKey())).rejects.toThrow();
  });
});
