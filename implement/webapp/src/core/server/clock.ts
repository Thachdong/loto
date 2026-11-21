import "server-only";

let source: () => Date = () => new Date();

/** Giờ server. Service luôn dùng hàm này, không gọi `Date.now()` trực tiếp. */
export function now(): Date {
  return source();
}

/** Chỉ dùng trong test: thay nguồn giờ (BR-04, BR-05…). */
export function setClock(fn: () => Date): void {
  source = fn;
}

export function resetClock(): void {
  source = () => new Date();
}
