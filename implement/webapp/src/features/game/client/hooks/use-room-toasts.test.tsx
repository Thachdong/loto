// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { makeRoom } from "@/features/game/client/test-fixtures";
import type { RoomView } from "@/features/room/shared/types";
import { useRoomToasts } from "./use-room-toasts";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));

const ev = (type: string, atMs: number | null, over: Partial<NonNullable<RoomView["lastEvent"]>> = {}): RoomView["lastEvent"] => ({
  type,
  targetUid: null,
  text: null,
  atMs,
  ...over,
});

describe("useRoomToasts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toast.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const setup = (initial: RoomView | null) => renderHook(({ r }) => useRoomToasts(r, "me"), { initialProps: { r: initial } });

  it("skips the first snapshot (old event) and the first after null", () => {
    const a = setup(makeRoom({ lastEvent: ev("game_paused", 1) }));
    expect(toast).not.toHaveBeenCalled();
    a.unmount();
    const b = setup(null);
    b.rerender({ r: makeRoom({ lastEvent: ev("game_paused", 1) }) });
    expect(toast).not.toHaveBeenCalled();
  });

  it("toasts new events with 3s duration and dedupes the same event", () => {
    const { rerender } = setup(makeRoom());
    rerender({ r: makeRoom({ lastEvent: ev("game_paused", 5) }) });
    expect(toast).toHaveBeenCalledWith(dict.toast.gamePaused, { duration: 3000 });
    rerender({ r: makeRoom({ lastEvent: ev("game_paused", 5) }) });
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("queues consecutive events and shows them one per 3 seconds", () => {
    const { rerender } = setup(makeRoom());
    rerender({ r: makeRoom({ lastEvent: ev("game_paused", 1) }) });
    rerender({ r: makeRoom({ lastEvent: ev("game_resumed", 2) }) });
    rerender({ r: makeRoom({ lastEvent: ev("claim_submitted", 3, { text: "Lan KINH!" }) }) });
    expect(toast).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(3000));
    expect(toast).toHaveBeenCalledTimes(2);
    expect(toast).toHaveBeenLastCalledWith(dict.toast.gameResumed, { duration: 3000 });
    act(() => void vi.advanceTimersByTime(3000));
    expect(toast).toHaveBeenLastCalledWith("Lan KINH!", { duration: 3000 });
    act(() => void vi.advanceTimersByTime(10_000));
    expect(toast).toHaveBeenCalledTimes(3);
  });

  it("uses server text, claims_rejected copy; ignores room_expiring (local timer) and unknown types", () => {
    const { rerender } = setup(makeRoom());
    rerender({ r: makeRoom({ lastEvent: ev("room_expiring", 1) }) });
    rerender({ r: makeRoom({ lastEvent: ev("game_cancelled", 2) }) });
    expect(toast).not.toHaveBeenCalled();
    rerender({ r: makeRoom({ lastEvent: ev("claims_rejected", 3) }) });
    expect(toast).toHaveBeenCalledWith(dict.toast.claimsRejectedFallback, { duration: 3000 });
  });

  it("room_closed host_left falls back to the host-left copy", () => {
    const { rerender } = setup(makeRoom());
    rerender({ r: makeRoom({ closeReason: "host_left", lastEvent: ev("room_closed", 1) }) });
    expect(toast).toHaveBeenCalledWith(dict.toast.hostLeft, { duration: 3000 });
  });
});
