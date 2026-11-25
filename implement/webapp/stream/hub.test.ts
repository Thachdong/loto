import { describe, expect, it, vi } from "vitest";
import type { Sink } from "./broadcaster";
import { StreamHub } from "./hub";
import type { VoicePack } from "./pack";

const sink = (): Sink => ({ write: () => undefined, close: vi.fn(), backlog: () => 0 });

describe("StreamHub", () => {
  it("1 luồng / phòng; rỗng đủ lâu → dừng + hủy watch", () => {
    const unwatch = vi.fn();
    const watchRoom = vi.fn(() => unwatch);
    const timers: (() => void)[] = [];
    const hub = new StreamHub({
      watchRoom,
      loadPack: async () => ({}) as VoicePack,
      setTimer: (fn) => timers.push(fn),
      clearTimer: () => undefined,
    });
    const leaveA = hub.join("r1", sink());
    const leaveB = hub.join("r1", sink());
    expect(watchRoom).toHaveBeenCalledTimes(1);
    leaveA();
    expect(timers).toHaveLength(0);
    leaveB();
    expect(timers).toHaveLength(1);
    timers[0]!();
    expect(unwatch).toHaveBeenCalled();
    expect(hub.roomCount).toBe(0);
  });

  it("phòng đóng → ngắt mọi client", () => {
    let gone: () => void = () => undefined;
    const hub = new StreamHub({
      watchRoom: (_id, _s, onGone) => {
        gone = onGone;
        return () => undefined;
      },
      loadPack: async () => ({}) as VoicePack,
    });
    const s = sink();
    hub.join("r1", s);
    gone();
    expect(s.close).toHaveBeenCalled();
    expect(hub.roomCount).toBe(0);
  });
});
