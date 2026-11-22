// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeGame, makeRoom } from "@/features/game/client/test-fixtures";
import type { AudioEngine } from "@/features/game/client/lib/audio-engine";
import type { RoomView } from "@/features/room/shared/types";
import { useAudio } from "./use-audio";

function fakeEngine(unlocked = true) {
  return {
    unlock: vi.fn(),
    isUnlocked: () => unlocked,
    contextState: () => "running" as const,
    playNumber: vi.fn().mockResolvedValue(null),
    playEvent: vi.fn().mockResolvedValue(null),
    dispose: vi.fn(),
  } satisfies AudioEngine;
}
const ev = (type: string, atMs: number): RoomView["lastEvent"] => ({ type, targetUid: null, text: null, atMs });

describe("useAudio", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  const render = (engine: AudioEngine, initial: RoomView) =>
    renderHook(({ room }) => useAudio({ room, game: makeGame("running"), offsetMs: 0, engine, now: () => 0 }), { initialProps: { room: initial } });

  it("does not play for the first snapshot, plays when called_numbers grows", () => {
    const engine = fakeEngine();
    const { rerender } = render(engine, makeRoom({ calledNumbers: [3, 4] }));
    expect(engine.playNumber).not.toHaveBeenCalled();
    rerender({ room: makeRoom({ calledNumbers: [3, 4, 9] }) });
    expect(engine.playNumber).toHaveBeenCalledWith(9, expect.objectContaining({ receivedAt: 0 }));
  });

  it("does not play when the list shrinks (new game) or stays the same", () => {
    const engine = fakeEngine();
    const { rerender } = render(engine, makeRoom({ calledNumbers: [3, 4] }));
    rerender({ room: makeRoom({ calledNumbers: [] }) });
    rerender({ room: makeRoom({ calledNumbers: [] }) });
    expect(engine.playNumber).not.toHaveBeenCalled();
  });

  it("is silent before unlock or when sound is off", () => {
    const locked = fakeEngine(false);
    const a = render(locked, makeRoom({ calledNumbers: [1] }));
    a.rerender({ room: makeRoom({ calledNumbers: [1, 2] }) });
    expect(locked.playNumber).not.toHaveBeenCalled();

    window.localStorage.setItem("loto:sound", "off");
    const engine = fakeEngine();
    const b = render(engine, makeRoom({ calledNumbers: [1] }));
    b.rerender({ room: makeRoom({ calledNumbers: [1, 2] }) });
    expect(engine.playNumber).not.toHaveBeenCalled();
  });

  it("plays KINH on a new claim_submitted and miss on claims_rejected, not on the first snapshot", () => {
    const engine = fakeEngine();
    const { rerender } = render(engine, makeRoom({ lastEvent: ev("claim_submitted", 1) }));
    expect(engine.playEvent).not.toHaveBeenCalled();
    rerender({ room: makeRoom({ lastEvent: ev("claim_submitted", 2) }) });
    expect(engine.playEvent).toHaveBeenLastCalledWith("kinh", expect.anything());
    rerender({ room: makeRoom({ lastEvent: ev("claim_submitted", 2) }) });
    expect(engine.playEvent).toHaveBeenCalledTimes(1);
    rerender({ room: makeRoom({ lastEvent: ev("claims_rejected", 3) }) });
    expect(engine.playEvent).toHaveBeenLastCalledWith("miss", expect.anything());
    rerender({ room: makeRoom({ lastEvent: ev("game_paused", 4) }) });
    expect(engine.playEvent).toHaveBeenCalledTimes(2);
  });
});
