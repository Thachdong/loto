// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { ConnectionBanner } from "@/features/game/client/components/connection-banner";
import { OFFLINE_GRACE_MS, useConnection, useDebugConnection } from "./use-connection";

const m = vi.hoisted(() => ({
  cb: null as null | ((snap: { val: () => unknown }) => void),
  goOffline: vi.fn(),
  goOnline: vi.fn(),
  disableNetwork: vi.fn(() => Promise.resolve()),
  enableNetwork: vi.fn(() => Promise.resolve()),
}));

vi.mock("@/core/client/firebase", () => ({ getClientDatabase: () => ({}), getClientFirestore: () => ({}) }));
vi.mock("firebase/database", () => ({
  ref: (_db: unknown, path: string) => path,
  onValue: (_ref: string, cb: (snap: { val: () => unknown }) => void) => {
    m.cb = cb;
    return () => undefined;
  },
  goOffline: m.goOffline,
  goOnline: m.goOnline,
}));
vi.mock("firebase/firestore", () => ({ disableNetwork: m.disableNetwork, enableNetwork: m.enableNetwork }));

const emit = (v: boolean) => act(() => m.cb?.({ val: () => v }));

describe("useConnection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
    Object.values(m).forEach((v) => typeof v === "function" && "mockClear" in v && v.mockClear());
  });

  it("not offline before RTDB reports; offline only after the grace period; recovers immediately", () => {
    const { result } = renderHook(() => useConnection(false));
    expect(result.current).toBe(false);
    emit(false);
    expect(result.current).toBe(false);
    act(() => void vi.advanceTimersByTime(OFFLINE_GRACE_MS + 10));
    expect(result.current).toBe(true);
    emit(true);
    expect(result.current).toBe(false);
  });

  it("a brief false→true blip never shows the banner", () => {
    const { result } = renderHook(() => useConnection(false));
    emit(false);
    act(() => void vi.advanceTimersByTime(500));
    emit(true);
    act(() => void vi.advanceTimersByTime(5000));
    expect(result.current).toBe(false);
  });

  it("snapshot error shows banner immediately", () => {
    const { result } = renderHook(() => useConnection(true));
    expect(result.current).toBe(true);
  });

  it("?debug=offline / online toggles RTDB and Firestore networking (dev only)", () => {
    window.history.replaceState(null, "", "/room?debug=offline");
    renderHook(() => useDebugConnection());
    expect(m.goOffline).toHaveBeenCalled();
    expect(m.disableNetwork).toHaveBeenCalled();
    cleanup();
    window.history.replaceState(null, "", "/room?debug=online");
    renderHook(() => useDebugConnection());
    expect(m.goOnline).toHaveBeenCalled();
    expect(m.enableNetwork).toHaveBeenCalled();
  });

  it("no debug param → nothing", () => {
    renderHook(() => useDebugConnection());
    expect(m.goOffline).not.toHaveBeenCalled();
  });
});

describe("ConnectionBanner", () => {
  it("shows the lost-connection copy", () => {
    render(<ConnectionBanner />);
    expect(screen.getByTestId("conn-banner")).toHaveTextContent(dict.conn.lost);
  });
});
