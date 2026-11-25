import "server-only";

import type { Timestamp } from "firebase-admin/firestore";
import type { CloseReason, RoomStatus } from "@/features/room/shared/types";

/** database.md › TBL-02 `rooms/{roomId}` › `last_event` (SUP-01). */
export type LastEventDoc = {
  type: string;
  text: string | null;
  actor_uid: string | null;
  target_uid: string | null;
  at: Timestamp;
};

/**
 * Số đã chọn nhưng CHƯA hiện (ADR-05 sửa đổi): stream server phát clip `clip` ngay; số vào `called_numbers` ở lần
 * `drawNumber` kế tiếp, lúc clip gần hết (`games.next_call_at`).
 */
export type PendingCallDoc = { number: number; clip: string | null; duration_ms: number; game_id: string };

/** database.md › TBL-02 `rooms/{roomId}` — đúng tên field snake_case. */
export type RoomDoc = {
  name: string;
  host_uid: string;
  status: RoomStatus;
  member_count: number;
  blocked_uids: string[];
  invite_code: string;
  join_code: string;
  invite_expires_at: Timestamp;
  expires_at: Timestamp;
  draw_interval_sec: number;
  /** Bộ giọng rao (`public/audio/<id>/`), thiếu ở phòng cũ → mặc định. */
  voice_pack?: string;
  called_numbers: number[];
  pending_call?: PendingCallDoc | null;
  current_game_id: string;
  game_count: number;
  ticket_set_no: number;
  last_event: LastEventDoc | null;
  created_by: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  closed_at: Timestamp | null;
  close_reason: CloseReason | null;
  /** TTL (NFR-11, ADR-10) = created_at + 31 ngày. */
  expire_at: Timestamp;
};
