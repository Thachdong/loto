import { describe, expect, it } from "vitest";
import { INVITE_CODE_PATTERN, ROOM_CODE_ALPHABET, ROOM_CODE_PATTERN } from "@/features/room/shared/constants";
import { BASE62, randomCode } from "./random-code";
import { seededRng } from "./generate-ticket-set";

const fromRng = (seed: number) => {
  const rng = seededRng(seed);
  return (max: number) => Math.floor(rng() * max);
};

describe("randomCode", () => {
  it("BASE62 has 62 distinct characters", () => {
    expect(new Set(BASE62).size).toBe(62);
  });

  it("uses only the given alphabet with the given length", () => {
    const randomInt = fromRng(1);
    for (let i = 0; i < 1000; i++) {
      expect(randomCode(BASE62, 22, randomInt)).toMatch(INVITE_CODE_PATTERN);
      expect(randomCode(ROOM_CODE_ALPHABET, 6, randomInt)).toMatch(ROOM_CODE_PATTERN);
    }
  });

  it("maps randomInt results to alphabet indexes", () => {
    const seq = [0, 1, 2, 31];
    let i = 0;
    expect(randomCode(ROOM_CODE_ALPHABET, 4, () => seq[i++])).toBe("ABC9");
  });

  it("asks randomInt for alphabet.length each time", () => {
    const maxes: number[] = [];
    randomCode(ROOM_CODE_ALPHABET, 6, (max) => {
      maxes.push(max);
      return 0;
    });
    expect(maxes).toEqual([32, 32, 32, 32, 32, 32]);
  });
});
