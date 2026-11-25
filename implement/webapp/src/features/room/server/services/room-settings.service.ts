import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import type { ErrorCode } from "@/core/shared/errors";
import { getUserInTx } from "@/features/auth/db/user.repository";
import { runTransaction, setVoicePackInTx } from "@/features/room/db/room.repository";
import { voicePackOf } from "@/features/room/shared/domain/voice-pack";
import type { UpdateRoomInput } from "@/features/room/shared/schemas/update-room";
import type { RoomSettings } from "@/features/room/shared/types";
import { planLazyExpiry, type LazyExpiryPlan } from "./room-expiry.service";

type Outcome = { kind: "ok"; plan: LazyExpiryPlan; settings: RoomSettings } | { kind: "error"; code: ErrorCode; plan: LazyExpiryPlan | null };

/**
 * api-contract › updateRoom (ADR-08 sửa đổi): host đổi `rooms.voice_pack`. Transaction: thành viên (kể cả phòng vừa hết
 * hạn) → host → ghi (không `last_event`). Áp dụng từ số chờ kế tiếp (clip + giờ hiện chọn lúc `drawNumber`). Không đổi
 * → trả 200, không ghi. Nhịp quay 5/10/15 đã bỏ (nhịp theo audio — ADR-05 sửa đổi).
 */
export async function updateRoom(uid: string, input: UpdateRoomInput): Promise<RoomSettings> {
  const { roomId, voicePack } = input;
  const at = now();

  const outcome = await runTransaction<Outcome>(async (tx: Transaction) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== roomId) return { kind: "error", code: "NOT_ROOM_MEMBER", plan: null };

    const plan = await planLazyExpiry(tx, { roomId, now: at });
    const room = plan.room;
    plan.apply(tx);
    if (!room || plan.status === "closed" || plan.status === null) return { kind: "error", code: "NOT_ROOM_MEMBER", plan };
    if (room.hostUid !== uid) return { kind: "error", code: "NOT_ROOM_HOST", plan };

    if (room.voicePack !== voicePack) setVoicePackInTx(tx, roomId, voicePack, at);
    return {
      kind: "ok",
      plan,
      settings: { roomId, voicePack: voicePackOf(voicePack) },
    };
  });

  if (outcome.plan) await outcome.plan.afterCommit();
  if (outcome.kind === "error") throw new AppError(outcome.code);
  return outcome.settings;
}
