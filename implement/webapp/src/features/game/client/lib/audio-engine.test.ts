import { describe, expect, it, vi } from "vitest";
import { createAudioEngine, loadOrder } from "./audio-engine";

const manifest = {
  version: "v0",
  numbers: { "1": ["v0/n01a.m4a"], "2": ["v0/n02a.m4a"] },
  connectors: ["v0/c1.m4a"],
  miss: ["v0/miss.m4a"],
  kinh: ["v0/kinh.m4a"],
  congrats: ["v0/cg.m4a"],
};

function setup(over: { manifestOk?: boolean; durations?: Record<string, number> } = {}) {
  const started: { path: string; when: number }[] = [];
  const decoded = new Map<ArrayBuffer, string>();
  const ctx = {
    state: "running",
    currentTime: 10,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn(async (buf: ArrayBuffer) => ({ duration: over.durations?.[decoded.get(buf) ?? ""] ?? 1, path: decoded.get(buf) })),
    createBufferSource: vi.fn(() => {
      const src = { buffer: null as { path?: string } | null, connect: vi.fn(), start: vi.fn((when: number) => started.push({ path: src.buffer?.path ?? "", when })) };
      return src;
    }),
  };
  const fetchImpl = vi.fn(async (url: string) => {
    if (url.endsWith("manifest.json")) {
      return over.manifestOk === false ? ({ ok: false, status: 500 } as Response) : ({ ok: true, json: async () => manifest } as Response);
    }
    const buf = new ArrayBuffer(1);
    decoded.set(buf, url.replace("/audio/", ""));
    return { ok: true, arrayBuffer: async () => buf } as Response;
  });
  const onLoadError = vi.fn();
  const log = vi.fn();
  const engine = createAudioEngine({
    createContext: () => ctx as unknown as AudioContext,
    fetchImpl: fetchImpl as unknown as typeof fetch,
    now: () => 130,
    rng: () => 0,
    onLoadError,
    log,
  });
  return { engine, ctx, fetchImpl, started, onLoadError, log };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("loadOrder", () => {
  it("connectors, congrats, miss, kinh, then numbers ascending", () => {
    expect(loadOrder(manifest)).toEqual(["v0/c1.m4a", "v0/cg.m4a", "v0/miss.m4a", "v0/kinh.m4a", "v0/n01a.m4a", "v0/n02a.m4a"]);
  });
});

describe("createAudioEngine", () => {
  it("does nothing before unlock", async () => {
    const { engine, started } = setup();
    expect(await engine.playNumber(1, { receivedAt: 100 })).toBeNull();
    expect(started).toHaveLength(0);
  });

  it("unlock loads manifest, caches clips, plays number and logs latency", async () => {
    const { engine, started, fetchImpl, log } = setup();
    await engine.unlock();
    await flush();
    const fetched = fetchImpl.mock.calls.length;
    expect(fetched).toBe(1 + 6);
    const info = await engine.playNumber(1, { receivedAt: 100 });
    expect(info).toMatchObject({ kind: "number", clip: "v0/n01a.m4a", latencyMs: 30, connector: false });
    expect(started).toEqual([{ path: "v0/n01a.m4a", when: 10 }]);
    expect(fetchImpl.mock.calls.length).toBe(fetched); // từ cache
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ op: "play", latencyMs: 30 }));
  });

  it("missing number clip (e.g. 90) plays nothing", async () => {
    const { engine, started } = setup();
    await engine.unlock();
    expect(await engine.playNumber(90, { receivedAt: 100 })).toBeNull();
    expect(started).toHaveLength(0);
  });

  it("plays connector after the number only when enough time remains", async () => {
    const a = setup();
    await a.engine.unlock();
    await a.engine.playNumber(2, { receivedAt: 100, remainingMs: 5000 });
    expect(a.started.map((s) => s.path)).toEqual(["v0/n02a.m4a", "v0/c1.m4a"]);
    expect(a.started[1]?.when).toBe(11);

    const b = setup();
    await b.engine.unlock();
    await b.engine.playNumber(2, { receivedAt: 100, remainingMs: 2500 });
    expect(b.started.map((s) => s.path)).toEqual(["v0/n02a.m4a"]);
  });

  it("plays kinh / miss / congrats events", async () => {
    const { engine, started } = setup();
    await engine.unlock();
    await engine.playEvent("kinh", { receivedAt: 100 });
    await engine.playEvent("miss", { receivedAt: 100 });
    await engine.playEvent("congrats", { receivedAt: 100 });
    expect(started.map((s) => s.path)).toEqual(["v0/kinh.m4a", "v0/miss.m4a", "v0/cg.m4a"]);
  });

  it("manifest failure calls onLoadError and allows retry", async () => {
    const { engine, onLoadError, fetchImpl } = setup({ manifestOk: false });
    await engine.unlock();
    expect(onLoadError).toHaveBeenCalledTimes(1);
    await engine.unlock();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
