// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDrawInterval } from "./use-draw-interval";

const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: toastError } }));
vi.mock("@/features/room/server/actions/update-room.action", () => ({ updateRoomAction: vi.fn() }));

describe("useDrawInterval (SCR-11.A3)", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    toastError.mockClear();
  });

  it("AC-6: 2 quick + (5 → 10 → 15) → one call with 15 after 600 ms, optimistic value meanwhile", async () => {
    const update = vi.fn(async () => ({ ok: true as const, data: { roomId: "r1", drawIntervalSec: 15 } }));
    const { result } = renderHook(() => useDrawInterval("r1", 5, update));
    act(() => result.current.step(1));
    act(() => result.current.step(1));
    expect(result.current.value).toBe(15);
    await act(async () => vi.advanceTimersByTime(599));
    expect(update).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(1));
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({ roomId: "r1", drawIntervalSec: 15 });
  });

  it("AC-7: stays at 5 / 15", () => {
    const update = vi.fn();
    const { result } = renderHook(() => useDrawInterval("r1", 5, update as never));
    act(() => result.current.step(-1));
    expect(result.current.value).toBe(5);
    const high = renderHook(() => useDrawInterval("r1", 15, update as never));
    act(() => high.result.current.step(1));
    expect(high.result.current.value).toBe(15);
  });

  it("AC-10: failure → back to server value + toast; NOT_ROOM_HOST → forbidden", async () => {
    const update = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ ok: false, error: { code: "NOT_ROOM_HOST", message: "" } });
    const { result } = renderHook(() => useDrawInterval("r1", 5, update));
    act(() => result.current.step(1));
    await act(async () => vi.advanceTimersByTime(600));
    expect(result.current.value).toBe(5);
    expect(toastError).toHaveBeenCalledWith("Chưa đổi được nhịp quay");
    act(() => result.current.step(1));
    await act(async () => vi.advanceTimersByTime(600));
    expect(result.current.forbidden).toBe(true);
  });
});
