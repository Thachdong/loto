export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export type MarksStore = {
  read(gameId: string, ticketId: string): number[];
  write(gameId: string, ticketId: string, numbers: readonly number[]): void;
  /** Bật/tắt 1 số; trả mảng mới. */
  toggle(gameId: string, ticketId: string, n: number): number[];
  /** Gọi `listener` sau mỗi lần ghi (cho `useSyncExternalStore`); trả hàm hủy. */
  subscribe(listener: () => void): () => void;
};

const keyOf = (gameId: string, ticketId: string) => `${gameId}:${ticketId}`;

function parse(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= 90) : [];
  } catch {
    return [];
  }
}

/**
 * Ô đã đánh dấu mode Tự dò (SCR-04.A2, Q-047): localStorage key `{gameId}:{ticketId}` = mảng số.
 * `storage` tiêm vào (null / ném lỗi → giữ trong bộ nhớ trang).
 */
export function createMarksStore(storage: StorageLike | null): MarksStore {
  const memory = new Map<string, number[]>();
  const listeners = new Set<() => void>();

  function read(gameId: string, ticketId: string): number[] {
    const key = keyOf(gameId, ticketId);
    const cached = memory.get(key);
    if (cached) return cached;
    let stored: number[] = [];
    try {
      stored = parse(storage?.getItem(key) ?? null);
    } catch {
      stored = [];
    }
    memory.set(key, stored);
    return stored;
  }

  function write(gameId: string, ticketId: string, numbers: readonly number[]): void {
    const key = keyOf(gameId, ticketId);
    const next = [...new Set(numbers)].sort((a, b) => a - b);
    memory.set(key, next);
    try {
      storage?.setItem(key, JSON.stringify(next));
    } catch {
      // storage đầy / bị chặn: giữ trong bộ nhớ trang
    }
    listeners.forEach((l) => l());
  }

  function toggle(gameId: string, ticketId: string, n: number): number[] {
    const current = read(gameId, ticketId);
    const next = current.includes(n) ? current.filter((x) => x !== n) : [...current, n];
    write(gameId, ticketId, next);
    return read(gameId, ticketId);
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { read, write, toggle, subscribe };
}

/** `window.localStorage` nếu truy cập được, ngược lại `null` (VD chế độ riêng tư chặn). */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
