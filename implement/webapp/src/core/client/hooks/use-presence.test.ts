// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePresence, useRoomPresence } from "./use-presence";

type ValueCb = (snap: unknown) => void;
const rtdb = vi.hoisted(() => ({
  listeners: new Map<string, { cb: ValueCb; unsubscribe: ReturnType<typeof vi.fn> }[]>(),
  set: vi.fn(() => Promise.resolve()),
  update: vi.fn(() => Promise.resolve()),
  disconnectSet: vi.fn(() => Promise.resolve()),
  onDisconnectPaths: [] as string[],
}));

vi.mock("@/core/client/firebase", () => ({
  getClientAuth: () => ({ authStateReady: () => Promise.resolve() }),
  getClientDatabase: () => ({}),
}));
vi.mock("firebase/database", () => ({
  ref: (_db: unknown, path: string) => ({ path }),
  serverTimestamp: () => ({ ".sv": "timestamp" }),
  set: (...args: unknown[]) => (rtdb.set as (...a: unknown[]) => Promise<void>)(...args),
  onDisconnect: (node: { path: string }) => {
    rtdb.onDisconnectPaths.push(node.path);
    return { update: rtdb.update, set: rtdb.disconnectSet };
  },
  onValue: (node: { path: string }, cb: ValueCb) => {
    const unsubscribe = vi.fn();
    const list = rtdb.listeners.get(node.path) ?? [];
    list.push({ cb, unsubscribe });
    rtdb.listeners.set(node.path, list);
    return unsubscribe;
  },
}));

const me = { uid: "u1", displayName: "An", photoUrl: null };
const latest = (path: string) => rtdb.listeners.get(path)!.at(-1)!;
const children = (obj: Record<string, unknown>) => ({
  forEach: (fn: (c: { key: string; val: () => unknown }) => void) =>
    Object.entries(obj).forEach(([key, v]) => fn({ key, val: () => v })),
});

describe("usePresence", () => {
  beforeEach(() => {
    rtdb.listeners.clear();
    rtdb.onDisconnectPaths.length = 0;
    rtdb.set.mockClear();
    rtdb.update.mockClear();
    rtdb.disconnectSet.mockClear();
  });

  it("no room or no user → nothing registered", () => {
    renderHook(() => usePresence(null, me));
    renderHook(() => usePresence("r1", null));
    expect(rtdb.listeners.size).toBe(0);
  });

  it("when connected: registers onDisconnect(offline) then writes online node; re-writes on reconnect", async () => {
    renderHook(() => usePresence("r1", me));
    await waitFor(() => expect(rtdb.listeners.get(".info/connected")).toHaveLength(1));

    act(() => latest(".info/connected").cb({ val: () => false }));
    expect(rtdb.set).not.toHaveBeenCalled();

    act(() => latest(".info/connected").cb({ val: () => true }));
    await waitFor(() => expect(rtdb.set).toHaveBeenCalledTimes(1));
    expect(rtdb.onDisconnectPaths).toEqual(["presence/r1/u1"]);
    expect(rtdb.disconnectSet).toHaveBeenCalledWith({ online: false, display_name: "An", photo_url: null, at: { ".sv": "timestamp" } });
    expect(rtdb.set).toHaveBeenCalledWith(
      { path: "presence/r1/u1" },
      { online: true, display_name: "An", photo_url: null, at: { ".sv": "timestamp" } },
    );

    act(() => latest(".info/connected").cb({ val: () => true }));
    await waitFor(() => expect(rtdb.set).toHaveBeenCalledTimes(2));
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = renderHook(() => usePresence("r1", me));
    await waitFor(() => expect(rtdb.listeners.get(".info/connected")).toHaveLength(1));
    unmount();
    expect(latest(".info/connected").unsubscribe).toHaveBeenCalled();
  });
});

describe("useRoomPresence", () => {
  beforeEach(() => rtdb.listeners.clear());

  it("null room → idle", () => {
    const { result } = renderHook(() => useRoomPresence(null));
    expect(result.current).toEqual({ status: "idle", map: {} });
  });

  it("maps nodes to {uid: online}; missing uid has no key", async () => {
    const { result, unmount } = renderHook(() => useRoomPresence("r1"));
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(rtdb.listeners.get("presence/r1")).toHaveLength(1));

    act(() => latest("presence/r1").cb(children({ a: { online: true }, b: { online: false } })));
    expect(result.current).toEqual({ status: "ready", map: { a: true, b: false } });
    expect("c" in result.current.map).toBe(false);

    act(() => latest("presence/r1").cb(children({})));
    expect(result.current).toEqual({ status: "ready", map: {} });

    unmount();
    expect(latest("presence/r1").unsubscribe).toHaveBeenCalled();
  });
});
