import { voicePackOf } from "../src/features/room/shared/domain/voice-pack";
import type { RoomState } from "./broadcaster";

type Timestampish = { toMillis(): number } | null | undefined;

/** `rooms/{id}` (TBL-02, snake_case) → field stream cần. */
export function roomStateFromDoc(data: Record<string, unknown>): RoomState {
  const lastEvent = data.last_event as { type?: unknown; at?: Timestampish } | null | undefined;
  const type = lastEvent && typeof lastEvent.type === "string" ? lastEvent.type : null;
  const at = lastEvent?.at && typeof lastEvent.at.toMillis === "function" ? lastEvent.at.toMillis() : null;
  return {
    calledNumbers: Array.isArray(data.called_numbers) ? data.called_numbers.filter((n): n is number => typeof n === "number") : [],
    currentGameId: typeof data.current_game_id === "string" ? data.current_game_id : "",
    drawIntervalSec: typeof data.draw_interval_sec === "number" ? data.draw_interval_sec : 5,
    voicePack: voicePackOf(data.voice_pack),
    lastEventKey: type ? `${type}:${at ?? ""}` : null,
    lastEventType: type,
    status: typeof data.status === "string" ? data.status : "active",
  };
}
