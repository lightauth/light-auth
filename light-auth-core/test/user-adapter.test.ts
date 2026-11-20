import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createLightAuthUserAdapter } from "../src/adapters";
import { encryptJwt, type LightAuthUser, type LightAuthUserAdapter } from "../src";
import { secretKey, TEST_SECRET } from "./helpers/app";

const env = { LIGHT_AUTH_SECRET_VALUE: TEST_SECRET };
const basePath = "/api/auth";
const user = (providerUserId: string, overrides: Partial<LightAuthUser> = {}): LightAuthUser => ({
  providerUserId,
  providerName: "test",
  email: `${providerUserId}@example.com`,
  name: providerUserId,
  ...overrides,
});

let base: string;
const adapter = (isEncrypted = false): LightAuthUserAdapter => createLightAuthUserAdapter({ base, isEncrypted });
const get = (a: LightAuthUserAdapter, providerUserId: string) => a.getUser({ env, basePath, providerUserId });
const set = (a: LightAuthUserAdapter, u: LightAuthUser) => a.setUser({ env, basePath, user: u });

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "light-auth-users-"));
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

describe("file user adapter", () => {
  it("stores and reads a user", async () => {
    const users = adapter();
    await set(users, user("ada"));
    expect(await get(users, "ada")).toMatchObject({ providerUserId: "ada", email: "ada@example.com" });
  });

  it("encrypts the stored users", async () => {
    const users = adapter(true);
    await set(users, user("ada", { refreshToken: "secret-refresh-token" }));

    const [file] = await readdir(base);
    expect(await readFile(join(base, file), "utf-8")).not.toContain("secret-refresh-token");
    expect((await get(users, "ada"))?.refreshToken).toBe("secret-refresh-token");
  });

  it("keeps distinct users for ids that only differ by special characters", async () => {
    const users = adapter();
    await set(users, user("a.b", { refreshToken: "token-of-a.b" }));
    await set(users, user("a_b", { refreshToken: "token-of-a_b" }));

    expect((await get(users, "a.b"))?.refreshToken).toBe("token-of-a.b");
    expect((await get(users, "a_b"))?.refreshToken).toBe("token-of-a_b");
  });

  it("keeps the stored tokens when the provider does not send them again", async () => {
    const users = adapter();
    await set(users, user("ada", { refreshToken: "refresh", accessToken: "access", accessTokenExpiresAt: new Date(Date.now() + 3600_000) }));
    await set(users, user("ada", { name: "Ada Lovelace" }));

    expect(await get(users, "ada")).toMatchObject({ name: "Ada Lovelace", refreshToken: "refresh", accessToken: "access" });
  });

  it("reads a user stored by a previous version, then migrates it", async () => {
    const users = adapter();
    await writeFile(join(base, "ada_lovelace.json"), JSON.stringify(user("ada.lovelace", { refreshToken: "legacy-token" })));

    expect((await get(users, "ada.lovelace"))?.refreshToken).toBe("legacy-token");

    await set(users, user("ada.lovelace"));
    expect(await readdir(base)).not.toContain("ada_lovelace.json");
    expect((await get(users, "ada.lovelace"))?.refreshToken).toBe("legacy-token");
  });

  it("never returns the legacy file of another id", async () => {
    const users = adapter();
    await writeFile(join(base, "a_b.json"), JSON.stringify(user("a.b", { refreshToken: "token-of-a.b" })));

    expect(await get(users, "a_b")).toBeNull();
    await set(users, user("a_b"));
    expect(await readdir(base)).toContain("a_b.json");
  });

  it("reads a legacy encrypted user", async () => {
    await writeFile(join(base, "ada.json"), await encryptJwt(user("ada", { refreshToken: "legacy-token" }), secretKey()));
    expect((await get(adapter(true), "ada"))?.refreshToken).toBe("legacy-token");
  });

  it("deletes the user and its legacy file", async () => {
    const users = adapter();
    await writeFile(join(base, "ada_lovelace.json"), JSON.stringify(user("ada.lovelace")));
    await set(users, user("other"));
    await users.deleteUser({ env, basePath, user: user("ada.lovelace") });
    await users.deleteUser({ env, basePath, user: user("other") });
    await users.deleteUser({ env, basePath, user: user("") });

    expect(await readdir(base)).toEqual([]);
  });

  it("returns null for an unknown or unreadable user", async () => {
    const users = adapter(true);
    await writeFile(join(base, "broken.json"), "not a JWE");
    expect(await get(users, "unknown")).toBeNull();
    expect(await get(users, "broken")).toBeNull();
  });

  it("requires a user id", async () => {
    await expect(set(adapter(), user(""))).rejects.toThrow(/user id is required/);
  });

  it("works when its methods are destructured", async () => {
    const { setUser, getUser } = adapter();
    await setUser({ env, basePath, user: user("ada") });
    expect(await getUser({ env, basePath, providerUserId: "ada" })).not.toBeNull();
  });
});
