// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOST, ME, makeGame, makeRoom } from "@/features/game/client/test-fixtures";
import type { PlayerView } from "@/features/ticket/shared/types";
import { drawRoleOf, useDrawScheduler, type DrawCall } from "./use-draw-scheduler";

const player = (uid: string, ticketIds: PlayerView["ticketIds"]): PlayerView => ({ uid, displayName: uid, photoUrl: null, ticketIds });
const ok = (drawn = true) => ({ ok: true as const, data: { drawn, number: 5, seq: 0, nextCallAt: null, gameStatus: "running" as const } });

describe("drawRoleOf", () => {
  it("host / backup index / spectator", () => {
    const players = [player(HOST, ["red_a"]), player("b", ["blue_a"]), player(ME, ["red_b"]), player("viewer", [])];
    expect(drawRoleOf(HOST, HOST, players)).toBe("host");
    expect(drawRoleOf(ME, HOST, players)).toEqual({ backupIndex: 1 });
    expect(drawRoleOf("b", HOST, players)).toEqual({ backupIndex: 2 });
    expect(drawRoleOf("viewer", HOST, players)).toBeNull();
  });
});

describe("useDrawScheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const nextAt = (ms: number) => new Date(Date.now() + ms);
  const setup = (over: { meUid?: string; draw: DrawCall; nextMs?: number; status?: "running" | "paused"; calledNumbers?: number[]; offsetMs?: number }) => {
    const players = [player(HOST, ["red_a"]), player(ME, ["red_b"])];
    return renderHook(
      (p: { calledNumbers: number[]; nextMs: number; status: "running" | "paused" }) =>
        useDrawScheduler({
          room: makeRoom({ calledNumbers: p.calledNumbers }),
          game: makeGame(p.status, { nextCallAt: p.status === "running" ? nextAt(p.nextMs) : null }),
          players,
          meUid: over.meUid ?? HOST,
          offsetMs: over.offsetMs ?? 0,
          draw: over.draw,
        }),
      { initialProps: { calledNumbers: over.calledNumbers ?? [7], nextMs: over.nextMs ?? 3000, status: over.status ?? "running" } },
    );
  };

  it("host fires at next_call_at with current seq", async () => {
    const draw = vi.fn<DrawCall>().mockResolvedValue(ok());
    setup({ draw });
    await vi.advanceTimersByTimeAsync(2999);
    expect(draw).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(draw).toHaveBeenCalledWith({ roomId: "r1", gameId: "g1", seq: 1 });
  });

  it("backup k=1 fires 5s after next_call_at; server offset shifts the timer", async () => {
    const draw = vi.fn<DrawCall>().mockResolvedValue(ok());
    setup({ draw, meUid: ME, offsetMs: 1000 });
    await vi.advanceTimersByTimeAsync(6999);
    expect(draw).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it("does not schedule for spectators or when not running", async () => {
    const draw = vi.fn<DrawCall>().mockResolvedValue(ok());
    setup({ draw, meUid: "viewer" });
    setup({ draw, status: "paused" });
    await vi.advanceTimersByTimeAsync(20_000);
    expect(draw).not.toHaveBeenCalled();
  });

  it("reschedules (cancels old timer) when a number arrives", async () => {
    const draw = vi.fn<DrawCall>().mockResolvedValue(ok());
    const { rerender } = setup({ draw, meUid: ME });
    await vi.advanceTimersByTimeAsync(4000);
    rerender({ calledNumbers: [7, 8], nextMs: 3000, status: "running" });
    await vi.advanceTimersByTimeAsync(7000);
    expect(draw).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1100);
    expect(draw).toHaveBeenCalledWith({ roomId: "r1", gameId: "g1", seq: 2 });
  });

  it("retries network failures every 1s up to 3 times", async () => {
    const draw = vi.fn<DrawCall>().mockRejectedValue(new Error("net"));
    setup({ draw, nextMs: 0 });
    await vi.advanceTimersByTimeAsync(10);
    expect(draw).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3500);
    expect(draw).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(5000);
    expect(draw).toHaveBeenCalledTimes(4);
  });

  it("DRAW_TOO_EARLY reschedules using details nextCallAt", async () => {
    const draw = vi
      .fn<DrawCall>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: "DRAW_TOO_EARLY", message: "x", details: [{ code: "nextCallAt", nextCallAt: new Date(Date.now() + 5000).toISOString() }] },
      })
      .mockResolvedValue(ok());
    setup({ draw, nextMs: 0 });
    await vi.advanceTimersByTimeAsync(10);
    expect(draw).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(draw).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(draw).toHaveBeenCalledTimes(2);
  });

  it("refires on visibilitychange without double-scheduling", async () => {
    const draw = vi.fn<DrawCall>().mockResolvedValue(ok());
    setup({ draw, nextMs: 3000 });
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await vi.advanceTimersByTimeAsync(3100);
    expect(draw).toHaveBeenCalledTimes(1);
  });
});
