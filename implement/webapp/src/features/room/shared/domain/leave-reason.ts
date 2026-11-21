import type { LeaveReason, RoomView } from "@/features/room/shared/types";

/** Snapshot cuối của phòng client còn đọc được trước khi `current_room_id` thành null. */
export type LastRoomSnapshot = Pick<RoomView, "status" | "closeReason" | "expiresAt" | "lastEvent">;

/**
 * Suy ra lý do vừa rời phòng (SCR-02 §5, Q-050) khi listener thấy `current_room_id` → null:
 * - `last_event = member_kicked` nhắm vào mình → `kicked`;
 * - phòng `closed` với `close_reason = host_left` → `host_left` (Q-057);
 * - phòng `closed` (hết hạn) hoặc `expires_at` đã qua → `expired`;
 * - còn lại / không có snapshot → `unknown`. (`left` do chính client ghi khi bấm Rời.)
 */
export function inferLeaveReason(
  lastRoomSnapshot: LastRoomSnapshot | null,
  myUid: string,
  now: Date,
): Exclude<LeaveReason, "left"> {
  if (!lastRoomSnapshot) return "unknown";
  const { status, closeReason, expiresAt, lastEvent } = lastRoomSnapshot;
  if (lastEvent?.type === "member_kicked" && lastEvent.targetUid === myUid) return "kicked";
  if (status === "closed" && closeReason === "host_left") return "host_left";
  if (status === "closed" || closeReason === "expired") return "expired";
  if (expiresAt.getTime() <= now.getTime()) return "expired";
  return "unknown";
}
