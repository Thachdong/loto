import { inferLeaveReason } from "@/features/room/shared/domain/leave-reason";
import type { LeaveReasonRecord, RoomView } from "@/features/room/shared/types";

/** Bản ghi banner 4 SCR-02 từ snapshot cuối của phòng (logic ở `shared/domain/leave-reason`). */
export function leaveReasonRecord(lastRoom: RoomView | null, myUid: string, now: Date): LeaveReasonRecord {
  return { reason: inferLeaveReason(lastRoom, myUid, now), roomName: lastRoom?.name ?? null };
}
