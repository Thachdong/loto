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
    clip: async (kind: string) => clips[kind] ?? null,
    file: async (file: string) => clips[file] ?? null,
  } as unknown as VoicePack;
}

const base: RoomState = { pending: null, voicePack: "v1", lastEventKey: null, lastEventType: null, status: "active" };
const call = (n: number, seq = 0, game = "g1"): RoomState => ({ ...base, pending: { key: `${game}:${seq}:${n}`, number: n, clip: `n${n}` } });

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

  it("snapshot đầu không phát lại số chờ cũ; số chờ mới → phát đúng clip server chọn", async () => {
    const { b, out, sink, advance } = setup({ n7: clip("n7", 3), n8: clip("n8", 2) });
    await b.onState(call(7));
    b.add(sink);
    advance(0);
    await b.onState(call(7)); // cùng key → không phát
    expect(out).not.toContain("n7");
    await b.onState(call(8, 1));
    out.length = 0;
    advance(500);
    expect(out.filter((x) => x === "n8")).toHaveLength(2);
  });

  it("không chèn câu nối (giờ hiện số tính theo đúng độ dài clip)", async () => {
    const { b, out, sink, advance } = setup({ n1: clip("n1", 3), connector: clip("c", 5) });
    await b.onState(base);
    b.add(sink);
    await b.onState(call(1));
    advance(2000);
    expect(out).not.toContain("c");
    expect(out.filter((x) => x === "n1")).toHaveLength(3);
  });

  it("clip phát nối tiếp, không chồng nhau", async () => {
    const { b, out, sink, advance } = setup({ n1: clip("n1", 3), n2: clip("n2", 3) });
    await b.onState(base);
    b.add(sink);
    advance(0);
    out.length = 0;
    await b.onState(call(1));
    advance(100); // n1 đã bắt đầu
    await b.onState(call(2, 1));
    advance(1000);
    const seq = out.filter((x) => x !== "_");
    expect(seq).toEqual(["n1", "n1", "n1", "n2", "n2", "n2"]);
  });

  it("số chờ chưa kịp phát bị thay → bỏ số cũ", async () => {
    const { b, out, sink, advance } = setup({ n1: clip("n1", 3), n2: clip("n2", 3) });
    await b.onState(base);
    b.add(sink);
    await b.onState(call(1));
    await b.onState(call(2, 1));
    advance(1000);
    expect(out).not.toContain("n1");
    expect(out.filter((x) => x === "n2")).toHaveLength(3);
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

  it("ván mới cùng số → key khác → vẫn phát", async () => {
    const { b, out, sink, advance } = setup({ n5: clip("n5", 1) });
    await b.onState(call(5, 0, "g1"));
    b.add(sink);
    await b.onState(call(5, 0, "g2"));
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
