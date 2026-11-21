import { MAX_MEMBERS } from "@/features/room/shared/constants";
import type { RoomStatus } from "@/features/room/shared/types";
import type { InviteStatus } from "@/features/invite/shared/types";

export type InviteStatusInput = {
  status: RoomStatus;
  memberCount: number;
  inviteExpiresAt: Date;
};

/**
 * api-contract › InvitePreview › status (BR-03, BR-04, BR-05). Thứ tự ưu tiên:
 * `closed` → `expired` (phòng `closing` hoặc `now ≥ invite_expires_at`) → `full` (≥ 16 người) → `valid`.
 * Thuần: `now` do người gọi truyền vào.
 */
export function computeInviteStatus(room: InviteStatusInput, now: Date): InviteStatus {
  if (room.status === "closed") return "closed";
  if (room.status === "closing" || now.getTime() >= room.inviteExpiresAt.getTime()) return "expired";
  if (room.memberCount >= MAX_MEMBERS) return "full";
  return "valid";
}
