import { describe, expect, it } from "vitest";
import { TICKET_COLORS } from "@/features/room/shared/constants";
import type { Ticket } from "@/features/room/shared/types";
import { columnNumbers, columnOf, generateTicketSet, seededRng, type Rng } from "./generate-ticket-set";

const EXPECTED_IDS = TICKET_COLORS.flatMap((c) => [`${c}_a`, `${c}_b`]);

/** Kiểm mọi bất biến BR-08 của một bộ vé; trả danh sách lỗi (rỗng = hợp lệ). */
function violations(set: Ticket[]): string[] {
  const errors: string[] = [];
  const ids = set.map((t) => t.id);
  if (JSON.stringify(ids) !== JSON.stringify(EXPECTED_IDS)) errors.push(`ids ${ids.join(",")}`);

  for (const ticket of set) {
    const { grid, id } = ticket;
    if (ticket.id !== `${ticket.color}_${ticket.side}`) errors.push(`${id}: id/color/side`);
    if (grid.length !== 81) errors.push(`${id}: ${grid.length} cells`);
    let total = 0;
    for (let row = 0; row < 9; row++) {
      const filled = grid.slice(row * 9, row * 9 + 9).filter((n) => n !== 0).length;
      if (filled !== 5) errors.push(`${id}: row ${row} has ${filled}`);
      total += filled;
    }
    if (total !== 45) errors.push(`${id}: ${total} numbers`);
    for (let col = 0; col < 9; col++) {
      const inCol = [];
      for (let row = 0; row < 9; row++) {
        const n = grid[row * 9 + col];
        if (n === 0) continue;
        if (columnOf(n) !== col || n < 1 || n > 90) errors.push(`${id}: ${n} in col ${col}`);
        inCol.push(n);
      }
      for (let i = 1; i < inCol.length; i++) {
        if (inCol[i] <= inCol[i - 1]) errors.push(`${id}: col ${col} not ascending`);
      }
    }
  }

  for (const color of TICKET_COLORS) {
    const a = set.find((t) => t.id === `${color}_a`)?.grid ?? [];
    const b = set.find((t) => t.id === `${color}_b`)?.grid ?? [];
    const merged = [...a, ...b].filter((n) => n !== 0).sort((x, y) => x - y);
    const expected = Array.from({ length: 90 }, (_, i) => i + 1);
    if (JSON.stringify(merged) !== JSON.stringify(expected)) errors.push(`${color}: pair != 1..90`);
  }
  return errors;
}

describe("columnNumbers / columnOf", () => {
  it("column ranges follow BR-08 (9, 10×7, 11 numbers)", () => {
    expect(columnNumbers(0)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(columnNumbers(1)).toHaveLength(10);
    expect(columnNumbers(8)).toEqual([80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90]);
    expect(columnOf(9)).toBe(0);
    expect(columnOf(10)).toBe(1);
    expect(columnOf(89)).toBe(8);
    expect(columnOf(90)).toBe(8);
  });
});

describe("generateTicketSet", () => {
  it("AC-4: one set has 16 tickets red_a … pink_b satisfying BR-08", () => {
    const set = generateTicketSet(seededRng(1));
    expect(set).toHaveLength(16);
    expect(violations(set)).toEqual([]);
  });

  it("AC-5: 10.000 sets with random seeds are all valid, each ticket has 45 numbers (< 10s)", () => {
    const started = performance.now();
    let invalid = 0;
    const firstErrors: string[] = [];
    for (let i = 0; i < 10_000; i++) {
      const seed = Math.floor(Math.random() * 2 ** 32);
      const errors = violations(generateTicketSet(seededRng(seed)));
      if (errors.length > 0) {
        invalid++;
        if (firstErrors.length === 0) firstErrors.push(`seed ${seed}: ${errors[0]}`);
      }
    }
    const elapsed = performance.now() - started;
    expect(firstErrors).toEqual([]);
    expect(invalid).toBe(0);
    expect(elapsed).toBeLessThan(10_000);
  }, 20_000);

  it("AC-5: seededRng(42) gives the same set twice", () => {
    expect(generateTicketSet(seededRng(42))).toEqual(generateTicketSet(seededRng(42)));
    expect(generateTicketSet(seededRng(42))).not.toEqual(generateTicketSet(seededRng(43)));
  });

  it("terminates with a valid set for degenerate RNGs (retry limit + fallback)", () => {
    const degenerate: Rng[] = [() => 0, () => 0.999999, () => 0.5];
    for (const rng of degenerate) {
      expect(violations(generateTicketSet(rng))).toEqual([]);
    }
  });
});

describe("seededRng", () => {
  it("returns numbers in [0, 1)", () => {
    const rng = seededRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});
