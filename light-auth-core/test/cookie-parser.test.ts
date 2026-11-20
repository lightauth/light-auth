import { describe, expect, it } from "vitest";
import { parse, serialize } from "../src/services/cookieParser";

describe("parse", () => {
  it("parses the cookies of a Cookie header", () => {
    expect(parse("a=1; b=two;c=3")).toEqual({ a: "1", b: "two", c: "3" });
  });

  it("trims the names and the values", () => {
    expect(parse(" a = 1 ;\tb=2\t")).toEqual({ a: "1", b: "2" });
  });

  it("keeps the first value of a duplicated cookie", () => {
    expect(parse("a=1; a=2")).toEqual({ a: "1" });
  });

  it("decodes URI encoded values, and keeps malformed ones as is", () => {
    expect(parse("a=hello%20world; b=%E0%A4%A")).toEqual({ a: "hello world", b: "%E0%A4%A" });
  });

  it("uses a custom decoder", () => {
    expect(parse("a=abc", { decode: (value) => value.toUpperCase() })).toEqual({ a: "ABC" });
  });

  it("ignores the parts without value", () => {
    expect(parse("flag; a=1")).toEqual({ a: "1" });
    expect(parse("a")).toEqual({});
  });
});

describe("serialize", () => {
  it("encodes the value", () => {
    expect(serialize("a", "hello world")).toBe("a=hello%20world");
  });

  it("serializes every attribute", () => {
    const expires = new Date(Date.UTC(2030, 0, 1));
    expect(
      serialize("a", "1", {
        maxAge: 60,
        domain: "app.example",
        path: "/",
        expires,
        httpOnly: true,
        secure: true,
        partitioned: true,
        priority: "high",
        sameSite: "lax",
      })
    ).toBe(`a=1; Max-Age=60; Domain=app.example; Path=/; Expires=${expires.toUTCString()}; HttpOnly; Secure; Partitioned; Priority=High; SameSite=Lax`);
  });

  it.each<[boolean | "strict" | "lax" | "none", string]>([
    [true, "Strict"],
    ["strict", "Strict"],
    ["none", "None"],
  ])("serializes sameSite %s", (sameSite, expected) => {
    expect(serialize("a", "1", { sameSite })).toBe(`a=1; SameSite=${expected}`);
  });

  it.each<["low" | "medium", string]>([
    ["low", "Low"],
    ["medium", "Medium"],
  ])("serializes priority %s", (priority, expected) => {
    expect(serialize("a", "1", { priority })).toBe(`a=1; Priority=${expected}`);
  });

  it.each<[string, () => string]>([
    ["name", () => serialize("a;b", "1")],
    ["value", () => serialize("a", "1", { encode: (value) => `${value};` })],
    ["maxAge", () => serialize("a", "1", { maxAge: 1.5 })],
    ["domain", () => serialize("a", "1", { domain: "app.example;" })],
    ["path", () => serialize("a", "1", { path: "/;" })],
    ["expires", () => serialize("a", "1", { expires: new Date(Number.NaN) })],
    ["priority", () => serialize("a", "1", { priority: "urgent" as "high" })],
    ["sameSite", () => serialize("a", "1", { sameSite: "always" as "lax" })],
  ])("rejects an invalid %s", (_option, serializeCookie) => {
    expect(serializeCookie).toThrow(TypeError);
  });
});
