import { TICKET_COLORS } from "@/features/room/shared/constants";
import type { Ticket, TicketSide } from "@/features/room/shared/types";

/** Nguồn ngẫu nhiên đều trong [0, 1). Server dùng `cryptoRng()`, test/seed dùng `seededRng(seed)`. */
export type Rng = () => number;

export const GRID_SIZE = 9;
export const NUMBERS_PER_ROW = 5;
/** Số lần thử xếp ngẫu nhiên trước khi dùng cách xếp chắc chắn thành công (không bao giờ lặp vô hạn). */
const MAX_RANDOM_FILL_ATTEMPTS = 20;
/** Số lần thử chia số của một cặp sao cho mỗi cột của mỗi vé ≤ 9 số. */
const MAX_SPLIT_ATTEMPTS = 100;

/** Các số của cột `col` (0-based): cột 1 là 1–9, cột 2–8 là 10 số, cột 9 là 80–90 (BR-08). */
export function columnNumbers(col: number): number[] {
  const from = col === 0 ? 1 : col * 10;
  const to = col === GRID_SIZE - 1 ? 90 : col * 10 + 9;
  const out: number[] = [];
  for (let n = from; n <= to; n++) out.push(n);
  return out;
}

/** Cột (0-based) chứa số `n` trong 1–90. */
export function columnOf(n: number): number {
  return n >= 90 ? GRID_SIZE - 1 : Math.floor(n / 10);
}

function randomInt(rng: Rng, max: number): number {
  return Math.min(max - 1, Math.floor(rng() * max));
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Chia 90 số cho 2 vé, mỗi vé 45 số, mỗi cột của mỗi vé ≤ 9 số (đủ điều kiện Gale–Ryser cho lưới
 * 9 hàng × 5 số). Chỉ cột 9 (11 số) có thể vượt 9 → thử lại; quá giới hạn thì cân lại cột 9.
 */
function splitPair(rng: Rng): [number[][], number[][]] {
  const all: number[] = [];
  for (let n = 1; n <= 90; n++) all.push(n);

  let a: number[] = [];
  let b: number[] = [];
  for (let attempt = 0; attempt < MAX_SPLIT_ATTEMPTS; attempt++) {
    const shuffled = shuffle(all, rng);
    a = shuffled.slice(0, 45);
    b = shuffled.slice(45);
    if (columnsFit(a) && columnsFit(b)) return [byColumn(a), byColumn(b)];
  }
  // Dự phòng (xác suất cực nhỏ): đổi chỗ số ở cột quá tải với số của cột khác ở vé kia.
  return rebalance(byColumn(a), byColumn(b), rng);
}

function columnsFit(numbers: number[]): boolean {
  const counts = new Array<number>(GRID_SIZE).fill(0);
  for (const n of numbers) counts[columnOf(n)]++;
  return counts.every((c) => c <= GRID_SIZE);
}

function byColumn(numbers: number[]): number[][] {
  const cols: number[][] = Array.from({ length: GRID_SIZE }, () => []);
  for (const n of numbers) cols[columnOf(n)].push(n);
  return cols;
}

/** Cân lại để mỗi cột của mỗi vé ≤ 9, giữ tổng mỗi vé = 45 (đổi 1 số cột quá tải lấy 1 số cột khác). */
function rebalance(a: number[][], b: number[][], rng: Rng): [number[][], number[][]] {
  for (const [over, under] of [
    [a, b],
    [b, a],
  ]) {
    for (let col = 0; col < GRID_SIZE; col++) {
      while (over[col].length > GRID_SIZE) {
        const moved = over[col].splice(randomInt(rng, over[col].length), 1)[0];
        under[col].push(moved);
        // Bù lại: lấy 1 số từ cột khác của `under` mà `over` còn chỗ.
        const candidates = [];
        for (let c = 0; c < GRID_SIZE; c++) {
          if (c !== col && under[c].length > 0 && over[c].length < GRID_SIZE) candidates.push(c);
        }
        const back = candidates[randomInt(rng, candidates.length)];
        over[back].push(under[back].splice(randomInt(rng, under[back].length), 1)[0]);
      }
    }
  }
  return [a, b];
}

/**
 * Ma trận 0/1 9×9: tổng mỗi hàng = 5, tổng cột j = `colCounts[j]` (mỗi ≤ 9, tổng = 45).
 * Thử xếp ngẫu nhiên có giới hạn; bế tắc quá giới hạn → thuật toán Ryser (xếp vào hàng còn nhiều chỗ
 * nhất, phá hòa ngẫu nhiên) luôn thành công khi điều kiện Gale–Ryser thỏa.
 */
function fillMask(colCounts: number[], rng: Rng): boolean[][] {
  for (let attempt = 0; attempt < MAX_RANDOM_FILL_ATTEMPTS; attempt++) {
    const mask = tryRandomFill(colCounts, rng);
    if (mask) return mask;
  }
  return ryserFill(colCounts, rng);
}

function emptyMask(): boolean[][] {
  return Array.from({ length: GRID_SIZE }, () => new Array<boolean>(GRID_SIZE).fill(false));
}

function tryRandomFill(colCounts: number[], rng: Rng): boolean[][] | null {
  const mask = emptyMask();
  const rowLeft = new Array<number>(GRID_SIZE).fill(NUMBERS_PER_ROW);
  const order = shuffle(
    Array.from({ length: GRID_SIZE }, (_, i) => i),
    rng,
  );
  let colsLeft = GRID_SIZE;
  for (const col of order) {
    colsLeft--;
    // Hàng mà số chỗ còn lại > số cột còn lại sau cột này bắt buộc phải lấy ô ở cột này.
    const forced: number[] = [];
    const optional: number[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      if (rowLeft[r] === 0) continue;
      if (rowLeft[r] > colsLeft) forced.push(r);
      else optional.push(r);
    }
    const need = colCounts[col];
    if (forced.length > need || forced.length + optional.length < need) return null;
    const picked = [...forced, ...shuffle(optional, rng).slice(0, need - forced.length)];
    for (const r of picked) {
      mask[r][col] = true;
      rowLeft[r]--;
    }
  }
  return rowLeft.every((left) => left === 0) ? mask : null;
}

function ryserFill(colCounts: number[], rng: Rng): boolean[][] {
  const mask = emptyMask();
  const rowLeft = new Array<number>(GRID_SIZE).fill(NUMBERS_PER_ROW);
  const cols = Array.from({ length: GRID_SIZE }, (_, i) => i).sort((x, y) => colCounts[y] - colCounts[x]);
  for (const col of cols) {
    const rows = shuffle(
      Array.from({ length: GRID_SIZE }, (_, i) => i),
      rng,
    ).sort((x, y) => rowLeft[y] - rowLeft[x]);
    for (const r of rows.slice(0, colCounts[col])) {
      mask[r][col] = true;
      rowLeft[r]--;
    }
  }
  return mask;
}

/** Xếp số của một vé (theo cột) vào lưới 81 ô, số trong cột tăng dần từ trên xuống. */
function buildGrid(columns: number[][], rng: Rng): number[] {
  const counts = columns.map((c) => c.length);
  const mask = fillMask(counts, rng);
  const grid = new Array<number>(GRID_SIZE * GRID_SIZE).fill(0);
  for (let col = 0; col < GRID_SIZE; col++) {
    const sorted = [...columns[col]].sort((x, y) => x - y);
    let k = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
      if (mask[row][col]) grid[row * GRID_SIZE + col] = sorted[k++];
    }
  }
  return grid;
}

/**
 * Sinh bộ 16 vé (ADR-14, BR-08): 8 màu × 2 vé `a`/`b`; mỗi vé 9×9, mỗi hàng 5 số; số ở cột j
 * thuộc khoảng của cột; số trong cột tăng dần; vé a ∪ vé b cùng màu = {1..90} không trùng.
 */
export function generateTicketSet(rng: Rng): Ticket[] {
  const tickets: Ticket[] = [];
  for (const color of TICKET_COLORS) {
    const pair = splitPair(rng);
    (["a", "b"] as TicketSide[]).forEach((side, i) => {
      tickets.push({ id: `${color}_${side}`, color, side, grid: buildGrid(pair[i], rng) });
    });
  }
  return tickets;
}

/** RNG xác định theo seed (mulberry32) — cho test và seed emulator, KHÔNG dùng cho phòng thật. */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
