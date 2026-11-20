import { describe, expect, it } from "vitest";
import { parseReturnTo } from "./parse-return-to";

const CODE = "AAAAAAAAAAAAAAAAAAAAAA";

describe("parseReturnTo", () => {
  it("AC-8: accepts /join/{22 base62}", () => {
    expect(parseReturnTo(`/join/${CODE}`)).toBe(`/join/${CODE}`);
    expect(parseReturnTo("/join/aZ09aZ09aZ09aZ09aZ09aZ")).toBe("/join/aZ09aZ09aZ09aZ09aZ09aZ");
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.com",
    "//evil.com",
    `//evil.com/join/${CODE}`,
    `https://evil.com/join/${CODE}`,
    "/room",
    "/",
    "/join/abc",
    `/join/${CODE}A`,
    `/join/${CODE.slice(1)}`,
    `/join/${CODE.slice(2)}-_`,
    `/join/${CODE}/`,
    `/join/${CODE}?x=1`,
    `/join/${CODE}#h`,
    `/join/${CODE}\n`,
    `/JOIN/${CODE}`,
    `/join//${CODE}`,
    `/\\evil.com/${CODE}`,
  ])("AC-9: rejects %j", (raw) => {
    expect(parseReturnTo(raw)).toBeNull();
  });
});
