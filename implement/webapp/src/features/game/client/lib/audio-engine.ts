import { selectClip, type AudioManifest, type ClipKind } from "@/features/game/shared/domain/select-clip";

/** Câu nối chỉ phát khi sau số + nối còn ≥ 1 giây trước số kế tiếp (plan §6.1). */
export const CONNECTOR_MIN_SLACK_MS = 1000;
const LOAD_CONCURRENCY = 6;

export type PlayInfo = { kind: ClipKind; clip: string; latencyMs: number; connector: boolean };

export type AudioEngineDeps = {
  createContext?: () => AudioContext;
  fetchImpl?: typeof fetch;
  /** Đồng hồ đo độ trễ (ms), mặc định `performance.now()`. */
  now?: () => number;
  rng?: () => number;
  /** Thư mục tĩnh chứa manifest + clip (có `/` cuối). */
  baseUrl?: string;
  /** Gọi 1 lần khi không tải được manifest (clip lẻ lỗi thì bỏ qua — Q-029). */
  onLoadError?: () => void;
  log?: (payload: Record<string, unknown>) => void;
};

export type PlayOptions = {
  /** Mốc nhận sự kiện (`now()`), để tính `latencyMs`. */
  receivedAt: number;
  /** Số ms còn lại tới số kế tiếp (chỉ để quyết định có phát câu nối). */
  remainingMs?: number;
};

export type AudioEngine = {
  /** Gọi trong cử chỉ người dùng: tạo/tiếp tục `AudioContext`, tải manifest + clip theo ưu tiên. */
  unlock(): Promise<void>;
  isUnlocked(): boolean;
  /** `AudioContext.state` hiện tại (`null` khi chưa tạo). */
  contextState(): AudioContextState | null;
  playNumber(n: number, options: PlayOptions): Promise<PlayInfo | null>;
  playEvent(kind: "kinh" | "miss" | "congrats", options: PlayOptions): Promise<PlayInfo | null>;
  dispose(): void;
};

/** Thứ tự ưu tiên tải (ADR-08): câu nối, chúc mừng, kinh hụt, KINH, rồi các số. */
export function loadOrder(manifest: AudioManifest): string[] {
  const urls: string[] = [];
  const push = (list: readonly string[] | undefined) => list?.forEach((u) => urls.push(u));
  push(manifest.connectors);
  push(manifest.congrats);
  push(manifest.miss);
  push(manifest.kinh);
  Object.keys(manifest.numbers ?? {})
    .sort((a, b) => Number(a) - Number(b))
    .forEach((key) => push(manifest.numbers?.[key]));
  return urls;
}

/** Web Audio engine (ADR-08): cache `AudioBuffer`, phát theo `selectClip`; thiếu clip → trả `null` (chỉ hiện số). */
export function createAudioEngine(deps: AudioEngineDeps = {}): AudioEngine {
  const baseUrl = deps.baseUrl ?? "/audio/";
  const now = deps.now ?? (() => performance.now());
  const rng = deps.rng ?? Math.random;
  const log =
    deps.log ??
    ((payload: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== "production") console.debug("[audio]", payload);
    });

  let ctx: AudioContext | null = null;
  let manifest: AudioManifest | null = null;
  let unlocked = false;
  let disposed = false;
  let starting: Promise<void> | null = null;
  const buffers = new Map<string, AudioBuffer>();
  const loading = new Map<string, Promise<AudioBuffer | null>>();

  const doFetch = (url: string) => (deps.fetchImpl ?? fetch)(url);

  function loadClip(path: string): Promise<AudioBuffer | null> {
    const cached = buffers.get(path);
    if (cached) return Promise.resolve(cached);
    const pending = loading.get(path);
    if (pending) return pending;
    const promise = (async () => {
      try {
        if (!ctx) return null;
        const res = await doFetch(`${baseUrl}${path}`);
        if (!res.ok) return null;
        const decoded = await ctx.decodeAudioData(await res.arrayBuffer());
        buffers.set(path, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        loading.delete(path);
      }
    })();
    loading.set(path, promise);
    return promise;
  }

  async function preload(list: string[]) {
    let next = 0;
    const worker = async () => {
      while (!disposed && next < list.length) {
        const path = list[next++];
        if (path) await loadClip(path);
      }
    };
    await Promise.all(Array.from({ length: Math.min(LOAD_CONCURRENCY, list.length) }, worker));
  }

  async function start() {
    try {
      ctx = ctx ?? (deps.createContext ? deps.createContext() : new AudioContext());
      if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    } catch {
      deps.onLoadError?.();
      return;
    }
    unlocked = true;
    try {
      const res = await doFetch(`${baseUrl}manifest.json`);
      if (!res.ok) throw new Error(`manifest ${res.status}`);
      manifest = (await res.json()) as AudioManifest;
    } catch {
      deps.onLoadError?.();
      return;
    }
    void preload(loadOrder(manifest));
  }

  function playBuffer(buffer: AudioBuffer, when: number): void {
    if (!ctx) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(when);
  }

  async function play(kind: ClipKind, n: number | null, options: PlayOptions): Promise<PlayInfo | null> {
    if (!ctx || !manifest || !unlocked) return null;
    const clip = selectClip(manifest, kind, n, rng);
    if (!clip) return null;
    const buffer = await loadClip(clip);
    if (!buffer || !ctx || disposed) return null;
    if (ctx.state === "suspended") void ctx.resume().catch(() => undefined);

    const startAt = ctx.currentTime;
    playBuffer(buffer, startAt);
    const latencyMs = Math.round(now() - options.receivedAt);

    let connector = false;
    if (kind === "number" && options.remainingMs !== undefined) {
      const connectorClip = selectClip(manifest, "connector", null, rng);
      const connectorBuffer = connectorClip ? await loadClip(connectorClip) : null;
      if (connectorBuffer) {
        const total = (buffer.duration + connectorBuffer.duration) * 1000;
        if (options.remainingMs - total >= CONNECTOR_MIN_SLACK_MS) {
          playBuffer(connectorBuffer, startAt + buffer.duration);
          connector = true;
        }
      }
    }
    const info: PlayInfo = { kind, clip, latencyMs, connector };
    log({ op: "play", ...info, n });
    return info;
  }

  return {
    unlock() {
      if (disposed) return Promise.resolve();
      // Mỗi cử chỉ người dùng đều thử tiếp tục context (sau khi tải lại trang nó có thể đang `suspended`).
      if (ctx?.state === "suspended") void ctx.resume().catch(() => undefined);
      starting =
        starting ??
        start().then(() => {
          if (!manifest) starting = null; // lỗi tải → lần chạm sau thử lại
        });
      return starting;
    },
    isUnlocked: () => unlocked,
    contextState: () => ctx?.state ?? null,
    playNumber: (n, options) => play("number", n, options),
    playEvent: (kind, options) => play(kind, null, options),
    dispose() {
      disposed = true;
      void ctx?.close().catch(() => undefined);
      ctx = null;
    },
  };
}
