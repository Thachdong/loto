import * as crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { INVITE_CODE_PATTERN, ROOM_CODE_ALPHABET, ROOM_CODE_PATTERN } from "@/features/room/shared/constants";
import { BASE62, randomCode } from "@/features/room/shared/domain/random-code";

vi.mock("node:crypto", { spy: true });

const { cryptoRandomInt, cryptoRng } = await import("./random");

describe("cryptoRandomInt / cryptoRng", () => {
  it("AC-19: 10.000 invite codes + 10.000 join codes match format, invite codes unique, via crypto.randomInt", () => {
    const spy = vi.mocked(crypto.randomInt);
    spy.mockClear();
    const mathRandom = vi.spyOn(Math, "random");

    const invites = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const invite = randomCode(BASE62, 22, cryptoRandomInt);
      expect(invite).toMatch(INVITE_CODE_PATTERN);
      invites.add(invite);
      expect(randomCode(ROOM_CODE_ALPHABET, 6, cryptoRandomInt)).toMatch(ROOM_CODE_PATTERN);
    }

    expect(invites.size).toBe(10_000);
    expect(spy).toHaveBeenCalledTimes(10_000 * (22 + 6));
    expect(mathRandom).not.toHaveBeenCalled();
    mathRandom.mockRestore();
  });

  it("cryptoRandomInt stays within [0, max)", () => {
    for (let i = 0; i < 1000; i++) {
      const n = cryptoRandomInt(32);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(32);
    }
  });

  it("cryptoRng returns numbers in [0, 1)", () => {
    const rng = cryptoRng();
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
