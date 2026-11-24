"use client";

import "client-only";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { browserStorage, createMarksStore, type MarksStore, type StorageLike } from "@/features/game/shared/domain/marks-store";

const EMPTY: readonly number[] = [];
const noopSubscribe = () => () => undefined;
const getEmpty = () => EMPTY;

let shared: MarksStore | null = null;
function sharedStore(): MarksStore {
  return (shared ??= createMarksStore(browserStorage()));
}

/**
 * Nút "Check": đồng bộ ô đánh dấu (Tự dò) của vé với số đã gọi — bỏ ô đánh sai, đánh mọi số đã gọi có trên vé.
 */
export function syncTicketMarks(
  gameId: string,
  tickets: readonly { id: string; grid: readonly number[] }[],
  called: readonly number[],
  storage?: StorageLike | null,
): void {
  const store = storage === undefined ? sharedStore() : createMarksStore(storage);
  const calledSet = new Set(called);
  for (const tk of tickets) {
    store.write(
      gameId,
      tk.id,
      tk.grid.filter((n) => n !== 0 && calledSet.has(n)),
    );
  }
}

export type UseMarks = {
  marks: ReadonlySet<number>;
  toggle: (n: number) => void;
};

/**
 * SCR-04.A2: ô đã đánh dấu của 1 vé (mode Tự dò) — localStorage `{gameId}:{ticketId}`.
 * `storage` tiêm vào khi test; mặc định `window.localStorage` (lỗi → giữ trong bộ nhớ trang).
 */
export function useMarks(gameId: string | null, ticketId: string | null, storage?: StorageLike | null): UseMarks {
  const store = useMemo(() => (storage === undefined ? sharedStore() : createMarksStore(storage)), [storage]);
  const subscribe = gameId && ticketId ? store.subscribe : noopSubscribe;
  const getSnapshot = useCallback(() => (gameId && ticketId ? store.read(gameId, ticketId) : EMPTY), [store, gameId, ticketId]);
  const list = useSyncExternalStore(subscribe, getSnapshot, getEmpty);
  const marks = useMemo(() => new Set(list), [list]);
  const toggle = useCallback(
    (n: number) => {
      if (gameId && ticketId) store.toggle(gameId, ticketId, n);
    },
    [store, gameId, ticketId],
  );
  return { marks, toggle };
}
