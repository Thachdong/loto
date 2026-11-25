import { voicePackOf } from "../src/features/room/shared/domain/voice-pack";
import type { RoomState } from "./broadcaster";

type Timestampish = { toMillis(): number } | null | undefined;

function pendingOf(data: Record<string, unknown>): RoomState["pending"] {
  const p = data.pending_call as { number?: unknown; clip?: unknown; game_id?: unknown } | null | undefined;
  if (!p || typeof p.number !== "number") return null;
  const called = Array.isArray(data.called_numbers) ? data.called_numbers.length : 0;
  return { key: `${String(p.game_id)}:${called}:${p.number}`, number: p.number, clip: typeof p.clip === "string" ? p.clip : null };
}

/** `rooms/{id}` (TBL-02, snake_case) → field stream cần. */
export function roomStateFromDoc(data: Record<string, unknown>): RoomState {
  const lastEvent = data.last_event as { type?: unknown; at?: Timestampish } | null | undefined;
  const type = lastEvent && typeof lastEvent.type === "string" ? lastEvent.type : null;
  const at = lastEvent?.at && typeof lastEvent.at.toMillis === "function" ? lastEvent.at.toMillis() : null;
  return {
    pending: pendingOf(data),
    voicePack: voicePackOf(data.voice_pack),
    lastEventKey: type ? `${type}:${at ?? ""}` : null,
    lastEventType: type,
    status: typeof data.status === "string" ? data.status : "active",
  };
}
