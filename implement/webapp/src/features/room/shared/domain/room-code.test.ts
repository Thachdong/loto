import { describe, expect, it } from "vitest";
import { isRoomCode, normalizeRoomCode } from "./room-code";

describe("normalizeRoomCode (AC-24, BR-30)", () => {
  it("uppercases and removes whitespace", () => {
    expect(normalizeRoomCode(" k7m 2qx ")).toBe("K7M2QX");
  });

  it("drops characters outside the alphabet (O, 0, I, 1, symbols, emoji)", () => {
    expect(normalizeRoomCode("O0I1-K7🎉M2QX")).toBe("K7M2QX");
  });

  it("caps at 6 characters", () => {
    expect(normalizeRoomCode("ABCDEFGHJK")).toBe("ABCDEF");
  });

  it("empty input stays empty", () => {
    expect(normalizeRoomCode("")).toBe("");
  });
});

describe("isRoomCode", () => {
  it("accepts 6 valid characters only", () => {
    expect(isRoomCode("K7M2QX")).toBe(true);
    expect(isRoomCode("K7M2Q")).toBe(false);
    expect(isRoomCode("K7M2QXA")).toBe(false);
    expect(isRoomCode("k7m2qx")).toBe(false);
    expect(isRoomCode("K7M2Q0")).toBe(false);
  });
});
