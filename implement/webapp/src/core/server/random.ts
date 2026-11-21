import "server-only";

import { randomInt } from "node:crypto";

/** Số nguyên đều trong [0, max) bằng `crypto.randomInt` (NFR-08, ADR-09) — không dùng `Math.random`. */
export function cryptoRandomInt(max: number): number {
  return randomInt(max);
}

const RNG_RESOLUTION = 2 ** 48 - 1;

/** RNG trong [0, 1) dựa trên `crypto.randomInt` (48 bit) cho `generateTicketSet` (ADR-14). */
export function cryptoRng(): () => number {
  return () => randomInt(RNG_RESOLUTION) / RNG_RESOLUTION;
}
