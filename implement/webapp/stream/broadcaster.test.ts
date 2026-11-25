import { describe, expect, it } from "vitest";
import type { Mp3Frame } from "./mp3";
import { LEAD_MS, RoomBroadcaster, type RoomState, type Sink } from "./broadcaster";
import type { Clip, VoicePack } from "./pack";

const frame = (tag: string): Mp3Frame => ({ data: Buffer.from(tag), durationMs: 100, sampleRate: 48000, channels: 2 });
const clip = (name: string, n: number): Clip => ({ path: name, frames: Array.from({ length: n }, () => frame(name)) });

function fakePack(id = "v1", clips: Record<string, Clip | null> = {}): VoicePack {
  return {
    id,
    silence: [frame("_")],
    clip: async (kind: string, n: number | null) => clips[kind === "number" ? `n${n}` : kind] ?? null,
  } as unknown as VoicePack;
}

const base: RoomState = {
  calledNumbers: [],
  currentGameId: "g1",
  drawIntervalSec: 5,
  voicePack: "v1",
  lastEventKey: null,
  lastEventType: null,
  status: "active",
};

function setup(clips: Record<string, Clip | null>) {
  let t = 0;
  const out: string[] = [];
  const sink: Sink = { write: (c) => void out.push(c.toString()), close: () => undefined, backlog: () => 0 };
  const b = new RoomBroadcaster("r1", { now: () => t, loadPack: async (id) => fakePack(id, clips) });
  /** Tick mỗi 50 ms như server thật. */
  const advance = (ms: number) => {
    const end = t + ms;
    do {
      t = Math.min(end, t + 50);
      b.tick();
    } while (t < end);
  };
  return { b, out, sink, advance };
}

describe("RoomBroadcaster", () => {
  it("không có câu rao → chỉ im lặng, đúng nhịp thời gian", async () => {
    const { b, out, sink, advance } = setup({});
    await b.onState(base);
    b.add(sink);
    out.length = 0;
    advance(1000);
    // gửi trước LEAD_MS: tổng = 1000 + LEAD
    expect(out.length).toBe((1000 + LEAD_MS) / 100);
    expect(new Set(out)).toEqual(new Set(["_"]));
  });

  it("snapshot đầu không phát lại số cũ; số mới → phát clip", async () => {
    const { b, out, sink, advance } = setup({ n7: clip("n7", 3), n8: clip("n8", 2) });
    await b.onState({ ...base, calledNumbers: [7] });
    b.add(sink);
    advance(0);
    expect(out).not.toContain("n7");
    await b.onState({ ...base, calledNumbers: [7, 8] });
    out.length = 0;
    advance(500);
    expect(out.filter((x) => x === "n8")).toHaveLength(2);
    expect(out).not.toContain("n7");
  });

  it("câu nối chỉ khi còn đủ ≥ 1 giây", async () => {
    const clips = { n1: clip("n1", 10), n2: clip("n2", 10), connector: clip("c", 5) };
    const { b, out, sink, advance } = setup(clips);
    await b.onState(base);
    b.add(sink);
    await b.onState({ ...base, calledNumbers: [1] }); // 5s − 1s − 0.5s ≥ 1s → có nối
    advance(2000);
    expect(out.filter((x) => x === "c")).toHaveLength(5);
    out.length = 0;
    await b.onState({ ...base, drawIntervalSec: 2, calledNumbers: [1, 2] }); // 2s − 1.5s < 1s → không nối
    advance(2000);
    expect(out).not.toContain("c");
  });

  it("số mới tới khi số cũ chưa phát → bỏ số cũ", async () => {
    const { b, out, sink, advance } = setup({ n1: clip("n1", 3), n2: clip("n2", 3), n3: clip("n3", 3) });
    await b.onState(base);
    b.add(sink);
    advance(0); // đã gửi trước LEAD_MS im lặng
    await b.onState({ ...base, calledNumbers: [1] });
    await b.onState({ ...base, calledNumbers: [1, 2] });
    await b.onState({ ...base, calledNumbers: [1, 2, 3] });
    advance(1000);
    expect(out).not.toContain("n1");
    expect(out).not.toContain("n2");
    expect(out.filter((x) => x === "n3")).toHaveLength(3);
  });

  it("sự kiện KINH / chúc mừng phát 1 lần theo last_event", async () => {
    const { b, out, sink, advance } = setup({ kinh: clip("k", 2), congrats: clip("w", 2) });
    await b.onState(base);
    b.add(sink);
    const kinh = { ...base, lastEventKey: "claim_submitted:1", lastEventType: "claim_submitted" };
    await b.onState(kinh);
    await b.onState(kinh); // cùng key → không lặp
    await b.onState({ ...base, lastEventKey: "game_finished:2", lastEventType: "game_finished" });
    advance(1000);
    expect(out.filter((x) => x === "k")).toHaveLength(2);
    expect(out.filter((x) => x === "w")).toHaveLength(2);
  });

  it("ván mới (game đổi) → số đầu ván mới vẫn phát", async () => {
    const { b, out, sink, advance } = setup({ n5: clip("n5", 1) });
    await b.onState({ ...base, calledNumbers: [1, 2, 3] });
    b.add(sink);
    await b.onState({ ...base, currentGameId: "g2", calledNumbers: [] });
    await b.onState({ ...base, currentGameId: "g2", calledNumbers: [5] });
    advance(1000);
    expect(out).toContain("n5");
  });

  it("client chậm (backlog lớn) → bị ngắt", async () => {
    const { b, advance } = setup({});
    await b.onState(base);
    let closed = false;
    b.add({ write: () => undefined, close: () => (closed = true), backlog: () => 10_000_000 });
    advance(200);
    expect(closed).toBe(true);
    expect(b.listenerCount).toBe(0);
  });
});
