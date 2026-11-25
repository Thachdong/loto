import { RoomBroadcaster, type BroadcasterDeps, type RoomState, type Sink } from "./broadcaster";

/** Theo dõi `rooms/{id}`: gọi `onState` mỗi snapshot, `onGone` khi phòng không còn; trả hàm hủy. */
export type WatchRoom = (roomId: string, onState: (state: RoomState) => void, onGone: () => void) => () => void;

export type HubDeps = BroadcasterDeps & {
  watchRoom: WatchRoom;
  /** Không còn ai nghe sau khoảng này → dừng luồng phòng (ms). */
  idleMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
};

type Entry = { broadcaster: RoomBroadcaster; unwatch: () => void; idle: unknown };

/** Quản lý luồng theo phòng: tạo khi có người nghe đầu tiên, hủy khi rỗng đủ lâu hoặc phòng đóng. */
export class StreamHub {
  private readonly rooms = new Map<string, Entry>();
  private readonly idleMs: number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (handle: unknown) => void;

  constructor(private readonly deps: HubDeps) {
    this.idleMs = deps.idleMs ?? 30_000;
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  /** Gắn client vào luồng phòng; trả hàm gỡ (gọi khi kết nối đóng). */
  join(roomId: string, sink: Sink): () => void {
    let entry = this.rooms.get(roomId);
    if (!entry) {
      const broadcaster = new RoomBroadcaster(roomId, this.deps);
      const created: Entry = { broadcaster, unwatch: () => undefined, idle: null };
      created.unwatch = this.deps.watchRoom(
        roomId,
        (state) => void broadcaster.onState(state),
        () => this.stop(roomId),
      );
      this.rooms.set(roomId, created);
      entry = created;
    }
    if (entry.idle !== null) {
      this.clearTimer(entry.idle);
      entry.idle = null;
    }
    entry.broadcaster.add(sink);
    const current = entry;
    return () => {
      current.broadcaster.remove(sink);
      if (current.broadcaster.listenerCount === 0 && current.idle === null && this.rooms.get(roomId) === current) {
        current.idle = this.setTimer(() => this.stop(roomId), this.idleMs);
      }
    };
  }

  tick(): void {
    for (const entry of this.rooms.values()) entry.broadcaster.tick();
  }

  stop(roomId: string): void {
    const entry = this.rooms.get(roomId);
    if (!entry) return;
    this.rooms.delete(roomId);
    if (entry.idle !== null) this.clearTimer(entry.idle);
    entry.unwatch();
    entry.broadcaster.close();
  }

  stopAll(): void {
    for (const roomId of [...this.rooms.keys()]) this.stop(roomId);
  }
}
