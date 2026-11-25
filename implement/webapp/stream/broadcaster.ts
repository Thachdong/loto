import type { Mp3Frame } from "./mp3";
import type { Clip, VoicePack } from "./pack";

/** Máy nghe gắn vào luồng của phòng (HTTP response). `backlog()` quá lớn = client chậm, bị ngắt. */
export type Sink = { write(chunk: Buffer): void; close(): void; backlog(): number };

/** Field `rooms/{id}` stream cần (đã chuẩn hóa). */
export type RoomState = {
  /** `rooms.pending_call`: số đang rao (chưa hiện) + clip server đã chọn; `key` đổi = số chờ mới. */
  pending: { key: string; number: number; clip: string | null } | null;
  voicePack: string;
  /** `last_event.type` + `last_event.at` để phát KINH / kinh hụt / chúc mừng đúng 1 lần. */
  lastEventKey: string | null;
  lastEventType: string | null;
  status: string;
};

type SegmentKind = "number" | "event";
type Segment = { kind: SegmentKind; frames: Mp3Frame[]; index: number };

export type BroadcasterDeps = {
  now?: () => number;
  log?: (payload: Record<string, unknown>) => void;
  rng?: () => number;
  loadPack: (id: string) => Promise<VoicePack>;
};

/** Gửi trước so với đồng hồ thật để client có đệm (ms). */
export const LEAD_MS = 400;
/** Bị trễ quá mức này (timer bị treo) → bỏ qua, không dồn gửi. */
const MAX_CATCH_UP_MS = 2000;
/** Client chậm giữ quá nhiều byte chưa gửi → ngắt. */
const MAX_BACKLOG_BYTES = 512 * 1024;

const EVENT_KIND: Record<string, "kinh" | "miss" | "congrats"> = {
  claim_submitted: "kinh",
  claims_rejected: "miss",
  game_finished: "congrats",
};

/**
 * Một luồng MP3 liên tục cho một phòng: mọi client nghe chung một dòng frame, phát theo nhịp thời gian thực.
 * Không có câu rao → chèn frame im lặng (luồng không bao giờ cạn, `<audio>` không bị dừng vì hết dữ liệu).
 */
export class RoomBroadcaster {
  private readonly now: () => number;
  private readonly log: (payload: Record<string, unknown>) => void;
  private readonly rng: () => number;
  private readonly sinks = new Set<Sink>();
  private readonly queue: Segment[] = [];
  private pack: VoicePack | null = null;
  private silenceIndex = 0;
  private startedAt = 0;
  private sentMs = 0;
  private state: RoomState | null = null;
  private work: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(
    readonly roomId: string,
    private readonly deps: BroadcasterDeps,
  ) {
    this.now = deps.now ?? (() => performance.now());
    this.log = deps.log ?? (() => undefined);
    this.rng = deps.rng ?? Math.random;
    this.startedAt = this.now();
  }

  get listenerCount(): number {
    return this.sinks.size;
  }

  get ready(): boolean {
    return this.pack !== null;
  }

  add(sink: Sink): void {
    this.sinks.add(sink);
    // Đệm im lặng ngay để trình duyệt bắt đầu phát mà không chờ.
    if (this.pack) for (const frame of this.takeSilence(LEAD_MS)) sink.write(frame.data);
  }

  remove(sink: Sink): void {
    this.sinks.delete(sink);
  }

  /** Snapshot mới của `rooms/{id}` — xếp câu rao theo thay đổi (chạy tuần tự). */
  onState(next: RoomState): Promise<void> {
    this.work = this.work.then(() => this.apply(next)).catch((error: unknown) => {
      this.log({ op: "apply_failed", roomId: this.roomId, message: String(error) });
    });
    return this.work;
  }

  /** Gửi các frame tới hạn; gọi đều đặn (~20–50 ms). */
  tick(): void {
    if (this.closed || !this.pack) return;
    const target = this.now() - this.startedAt + LEAD_MS;
    if (target - this.sentMs > MAX_CATCH_UP_MS) this.sentMs = target - LEAD_MS;
    while (this.sentMs < target) {
      const frame = this.nextFrame();
      this.sentMs += frame.durationMs;
      for (const sink of this.sinks) {
        if (sink.backlog() > MAX_BACKLOG_BYTES) {
          this.sinks.delete(sink);
          sink.close();
          this.log({ op: "drop_slow", roomId: this.roomId });
          continue;
        }
        sink.write(frame.data);
      }
    }
  }

  close(): void {
    this.closed = true;
    for (const sink of this.sinks) sink.close();
    this.sinks.clear();
  }

  private async apply(next: RoomState): Promise<void> {
    const previous = this.state;
    this.state = next;
    if (!this.pack || this.pack.id !== next.voicePack) {
      this.pack = await this.deps.loadPack(next.voicePack);
      this.silenceIndex = 0;
    }
    if (!previous) return; // snapshot đầu: không phát lại số cũ
    if (next.status !== "active") return;

    if (next.pending && next.pending.key !== previous.pending?.key) await this.enqueueNumber(next.pending.number, next.pending.clip);

    if (next.lastEventKey && next.lastEventKey !== previous.lastEventKey && next.lastEventType) {
      const kind = EVENT_KIND[next.lastEventType];
      if (kind) await this.enqueue("event", await this.pack.clip(kind, null, this.rng));
    }
  }

  /**
   * Số chờ mới: phát nối tiếp sau đoạn đang phát (server đã hẹn giờ hiện số theo độ dài clip — không chèn câu nối để
   * khỏi lệch). Số chờ cũ chưa kịp phát → bỏ.
   */
  private async enqueueNumber(n: number, file: string | null): Promise<void> {
    const pack = this.pack;
    if (!pack) return;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const seg = this.queue[i]!;
      if (seg.kind === "number" && seg.index === 0) this.queue.splice(i, 1);
    }
    const clip = file ? await pack.file(file) : null;
    if (!clip) {
      this.log({ op: "missing_clip", roomId: this.roomId, n });
      return;
    }
    await this.enqueue("number", clip);
    this.log({ op: "enqueue", roomId: this.roomId, n, clip: clip.path });
  }

  private async enqueue(kind: SegmentKind, clip: Clip | null): Promise<void> {
    if (!clip || clip.frames.length === 0) return;
    this.queue.push({ kind, frames: clip.frames, index: 0 });
  }

  private nextFrame(): Mp3Frame {
    const head = this.queue[0];
    if (head) {
      const frame = head.frames[head.index++]!;
      if (head.index >= head.frames.length) this.queue.shift();
      return frame;
    }
    return this.takeSilence(1)[0]!;
  }

  private takeSilence(ms: number): Mp3Frame[] {
    const frames = this.pack!.silence;
    const out: Mp3Frame[] = [];
    let total = 0;
    while (total < ms) {
      const frame = frames[this.silenceIndex++ % frames.length]!;
      out.push(frame);
      total += frame.durationMs;
    }
    return out;
  }
}
