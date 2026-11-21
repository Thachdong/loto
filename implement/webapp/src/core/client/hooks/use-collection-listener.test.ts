// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCollectionListener } from "./use-collection-listener";

type Handlers = { next: (snap: unknown) => void; error: (e: { code: string }) => void; unsubscribe: ReturnType<typeof vi.fn> };
const fs = vi.hoisted(() => ({ subs: new Map<string, Handlers[]>() }));

vi.mock("@/core/client/firebase", () => ({
  getClientAuth: () => ({ authStateReady: () => Promise.resolve() }),
  getClientFirestore: () => ({}),
}));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, path: string) => ({ path }),
  onSnapshot: (ref: { path: string }, next: Handlers["next"], error: Handlers["error"]) => {
    const unsubscribe = vi.fn();
    const list = fs.subs.get(ref.path) ?? [];
    list.push({ next, error, unsubscribe });
    fs.subs.set(ref.path, list);
    return unsubscribe;
  },
}));

const snap = (docs: Record<string, Record<string, unknown>>) => ({
  docs: Object.entries(docs).map(([id, data]) => ({ id, data: () => data })),
});
const map = (data: Record<string, unknown>, id: string) => ({ id, name: data.name as string });
const latest = (path: string) => fs.subs.get(path)!.at(-1)!;

describe("useCollectionListener", () => {
  beforeEach(() => fs.subs.clear());
  afterEach(() => vi.useRealTimers());

  it("null path → idle, no subscription", () => {
    const { result } = renderHook(() => useCollectionListener(null, map));
    expect(result.current.status).toBe("idle");
    expect(result.current.data).toEqual([]);
    expect(fs.subs.size).toBe(0);
  });

  it("loading → ready with mapped docs; unsubscribes on unmount", async () => {
    const { result, unmount } = renderHook(() => useCollectionListener("rooms/r1/tickets", map));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(fs.subs.get("rooms/r1/tickets")).toHaveLength(1));

    act(() => latest("rooms/r1/tickets").next(snap({ red_a: { name: "A" }, red_b: { name: "B" } })));
    expect(result.current.status).toBe("ready");
    expect(result.current.data).toEqual([
      { id: "red_a", name: "A" },
      { id: "red_b", name: "B" },
    ]);

    unmount();
    expect(latest("rooms/r1/tickets").unsubscribe).toHaveBeenCalled();
  });

  it("error keeps last data, then resubscribes after backoff", async () => {
    const { result } = renderHook(() => useCollectionListener("c/x", map));
    await waitFor(() => expect(fs.subs.get("c/x")).toHaveLength(1));
    act(() => latest("c/x").next(snap({ a: { name: "A" } })));

    vi.useFakeTimers();
    act(() => latest("c/x").error({ code: "unavailable" }));
    expect(result.current.status).toBe("error");
    expect(result.current.errorCode).toBe("unavailable");
    expect(result.current.data).toHaveLength(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    vi.useRealTimers();
    await waitFor(() => expect(fs.subs.get("c/x")).toHaveLength(2));
  });

  it("retry() resubscribes immediately", async () => {
    const { result } = renderHook(() => useCollectionListener("c/y", map));
    await waitFor(() => expect(fs.subs.get("c/y")).toHaveLength(1));
    act(() => latest("c/y").error({ code: "permission-denied" }));
    expect(result.current.status).toBe("error");

    act(() => result.current.retry());
    await waitFor(() => expect(fs.subs.get("c/y")).toHaveLength(2));
  });
});
