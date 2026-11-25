// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeRoom } from "@/features/game/client/test-fixtures";
import type { StreamPlayer } from "@/features/game/client/lib/stream-player";
import type { RoomView } from "@/features/room/shared/types";
import { useAudio } from "./use-audio";

const fakePlayer = () =>
  ({
    unlock: vi.fn().mockResolvedValue(undefined),
    isUnlocked: () => true,
    isBlocked: () => false,
    attach: vi.fn(),
    setMuted: vi.fn(),
    dispose: vi.fn(),
  }) satisfies StreamPlayer;
const ev = (type: string, atMs: number): RoomView["lastEvent"] => ({ type, targetUid: null, text: null, atMs });

describe("useAudio (stream)", () => {
  afterEach(cleanup);

  it("gắn player vào phòng, gỡ khi unmount", () => {
    const player = fakePlayer();
    const { unmount } = renderHook(() => useAudio({ room: makeRoom(), soundOn: true, player }));
    expect(player.attach).toHaveBeenCalledWith("r1");
    unmount();
    expect(player.attach).toHaveBeenLastCalledWith(null);
  });

  it("bật/tắt tiếng → setMuted", () => {
    const player = fakePlayer();
    const { rerender } = renderHook(({ soundOn }) => useAudio({ room: makeRoom(), soundOn, player }), { initialProps: { soundOn: true } });
    expect(player.setMuted).toHaveBeenLastCalledWith(false);
    rerender({ soundOn: false });
    expect(player.setMuted).toHaveBeenLastCalledWith(true);
  });

  it("rung khi có lượt KINH mới, không rung ở snapshot đầu", () => {
    const vibrate = vi.fn();
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const player = fakePlayer();
    const { rerender } = renderHook(({ room }) => useAudio({ room, soundOn: true, player }), {
      initialProps: { room: makeRoom({ lastEvent: ev("claim_submitted", 1) }) },
    });
    expect(vibrate).not.toHaveBeenCalled();
    rerender({ room: makeRoom({ lastEvent: ev("claim_submitted", 2) }) });
    expect(vibrate).toHaveBeenCalledTimes(1);
    rerender({ room: makeRoom({ lastEvent: ev("game_finished", 3) }) });
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
