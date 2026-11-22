// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { makeRoom } from "@/features/game/client/test-fixtures";
import { resetExpiryWarned, useExpiryTimer, type ExpireCall } from "./use-expiry-timer";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));

const MIN = 60_000;
const okResult = { ok: true as const, data: { roomStatus: "closed" as const, gameStatus: "cancelled" as const } };

describe("useExpiryTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    toast.mockClear();
    resetExpiryWarned();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const setup = (expiresInMs: number, expire: ExpireCall, id = "r1") => {
    const room = makeRoom({ id, expiresAt: new Date(Date.now() + expiresInMs) });
    return renderHook(() => useExpiryTimer({ room, offsetMs: 0, expire, rng: () => 0.5 }));
  };

  it("toasts once when crossing 15 minutes", async () => {
    const expire = vi.fn<ExpireCall>().mockResolvedValue(okResult);
    const { rerender } = setup(15 * MIN + 5000, expire);
    await vi.advanceTimersByTimeAsync(4000);
    expect(toast).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1500);
    expect(toast).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenCalledWith(dict.toast.expiresSoon);
    rerender();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(toast).toHaveBeenCalledTimes(1);
  });

  it("calls expireRoom after expiry plus jitter, not before", async () => {
    const expire = vi.fn<ExpireCall>().mockResolvedValue(okResult);
    setup(10_000, expire);
    await vi.advanceTimersByTimeAsync(10_900);
    expect(expire).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(expire).toHaveBeenCalledWith({ roomId: "r1" });
  });

  it("already expired on mount: calls within jitter, no warning toast", async () => {
    const expire = vi.fn<ExpireCall>().mockResolvedValue(okResult);
    setup(-5000, expire);
    await vi.advanceTimersByTimeAsync(2100);
    expect(expire).toHaveBeenCalledTimes(1);
    expect(toast).not.toHaveBeenCalled();
  });

  it("ROOM_NOT_EXPIRED schedules another attempt", async () => {
    const expire = vi
      .fn<ExpireCall>()
      .mockResolvedValueOnce({ ok: false, error: { code: "ROOM_NOT_EXPIRED", message: "x" } })
      .mockResolvedValue(okResult);
    setup(0, expire);
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(expire).toHaveBeenCalledTimes(1);
    await act(() => vi.advanceTimersByTimeAsync(1100));
    expect(expire).toHaveBeenCalledTimes(2);
  });
});
