import { describe, expect, it } from "vitest";
import { checkChatRate, messageLength, normalizeMessage } from "./message-rules";

describe("normalizeMessage (BR-23)", () => {
  it("empty / spaces → MESSAGE_EMPTY; trims", () => {
    expect(normalizeMessage("")).toEqual({ ok: false, code: "MESSAGE_EMPTY" });
    expect(normalizeMessage("   \n ")).toEqual({ ok: false, code: "MESSAGE_EMPTY" });
    expect(normalizeMessage("  hi  ")).toEqual({ ok: true, text: "hi" });
  });

  it("500 ok, 501 TOO_LONG, emoji counts as 1 code point", () => {
    expect(normalizeMessage("a".repeat(500)).ok).toBe(true);
    expect(normalizeMessage("a".repeat(501))).toEqual({ ok: false, code: "MESSAGE_TOO_LONG" });
    expect(normalizeMessage(`${"a".repeat(499)}😆`).ok).toBe(true);
    expect(messageLength(` ${"a".repeat(499)}😆 `)).toBe(500);
  });
});

describe("checkChatRate (SUP-07)", () => {
  const now = new Date(100_000);
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("4 stamps in 10s → allowed, keeps ≤ 5", () => {
    const r = checkChatRate([ago(9000), ago(5000), ago(3000), ago(1000)], now);
    expect(r.allowed).toBe(true);
    expect(r.nextRecent).toHaveLength(5);
    expect(r.nextRecent.at(-1)).toEqual(now);
  });

  it("5 stamps in 10s → denied", () => {
    expect(checkChatRate([ago(9999), ago(5000), ago(3000), ago(2000), ago(1000)], now).allowed).toBe(false);
  });

  it("oldest stamp 10.001s ago → allowed, oldest dropped", () => {
    const r = checkChatRate([ago(10_001), ago(5000), ago(3000), ago(2000), ago(1000)], now);
    expect(r.allowed).toBe(true);
    expect(r.nextRecent).toHaveLength(5);
    expect(r.nextRecent[0]).toEqual(ago(5000));
  });
});
