// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retryDelayMs, useDocListener } from "./use-doc-listener";

type Handlers = { next: (snap: unknown) => void; error: (e: { code: string }) => void; unsubscribe: ReturnType<typeof vi.fn> };

const fs = vi.hoisted(() => ({ subs: new Map<string, Handlers[]>() }));

vi.mock("@/core/client/firebase", () => ({
  getClientAuth: () => ({ authStateReady: () => Promise.resolve() }),
  getClientFirestore: () => ({}),
}));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, path: string) => ({ path }),
  onSnapshot: (ref: { path: string }, next: Handlers["next"], error: Handlers["error"]) => {
    const unsubscribe = vi.fn();
    const list = fs.subs.get(ref.path) ?? [];
    list.push({ next, error, unsubscribe });
    fs.subs.set(ref.path, list);
    return unsubscribe;
  },
}));

const snap = (id: string, data: Record<string, unknown> | null) => ({
  id,
  exists: () => data !== null,
  data: () => data,
});
const map = (data: Record<string, unknown>, id: string) => ({ id, name: data.name as string });
const latest = (path: string) => fs.subs.get(path)!.at(-1)!;

describe("useDocListener", () => {
  beforeEach(() => fs.subs.clear());
  afterEach(() => vi.useRealTimers());

  it("null path → idle, no subscription", () => {
    const { result } = renderHook(() => useDocListener(null, map));
    expect(result.current.status).toBe("idle");
    expect(fs.subs.size).toBe(0);
  });

  it("loading → ready with mapped data; missing doc → null; unsubscribes on unmount", async () => {
    const { result, unmount } = renderHook(() => useDocListener("rooms/r1", map));
    expect(result.current).toEqual({ status: "loading", data: null, errorCode: null });
    await waitFor(() => expect(fs.subs.get("rooms/r1")).toHaveLength(1));

    act(() => latest("rooms/r1").next(snap("r1", { name: "A" })));
    expect(result.current).toEqual({ status: "ready", data: { id: "r1", name: "A" }, errorCode: null });

    act(() => latest("rooms/r1").next(snap("r1", null)));
    expect(result.current).toEqual({ status: "ready", data: null, errorCode: null });

    unmount();
    expect(latest("rooms/r1").unsubscribe).toHaveBeenCalled();
  });

  it("error keeps last data, reports code and resubscribes after backoff", async () => {
    const { result } = renderHook(() => useDocListener("users/u1", map));
    await waitFor(() => expect(fs.subs.get("users/u1")).toHaveLength(1));
    act(() => latest("users/u1").next(snap("u1", { name: "An" })));

    vi.useFakeTimers();
    act(() => latest("users/u1").error({ code: "unavailable" }));
    expect(result.current).toEqual({ status: "error", data: { id: "u1", name: "An" }, errorCode: "unavailable" });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(retryDelayMs(0));
    });
    expect(fs.subs.get("users/u1")).toHaveLength(2);
    act(() => latest("users/u1").next(snap("u1", { name: "An 2" })));
    expect(result.current.status).toBe("ready");
    expect(result.current.data).toEqual({ id: "u1", name: "An 2" });
  });

  it("path change → loading for the new path, old listener unsubscribed", async () => {
    const { result, rerender } = renderHook(({ path }) => useDocListener(path, map), {
      initialProps: { path: "rooms/a" as string | null },
    });
    await waitFor(() => expect(fs.subs.get("rooms/a")).toHaveLength(1));
    act(() => latest("rooms/a").next(snap("a", { name: "A" })));

    rerender({ path: "rooms/b" });
    expect(result.current.status).toBe("loading");
    expect(latest("rooms/a").unsubscribe).toHaveBeenCalled();

    rerender({ path: null });
    expect(result.current.status).toBe("idle");
  });

  it("backoff grows and caps at 30s", () => {
    expect(retryDelayMs(0)).toBe(2_000);
    expect(retryDelayMs(1)).toBe(4_000);
    expect(retryDelayMs(10)).toBe(30_000);
  });
});
