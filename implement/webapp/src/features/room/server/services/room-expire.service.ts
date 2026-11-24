import "server-only";

import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { getUserInTx } from "@/features/auth/db/user.repository";
import { getGameInTx, runTransaction } from "@/features/room/db/room.repository";
import type { ExpireRoomInput } from "@/features/room/shared/schemas/expire-room";
import type { RoomExpireResult } from "@/features/room/shared/types";
import { planLazyExpiry, type LazyExpiryPlan } from "./room-expiry.service";

type Outcome =
  | { kind: "ok"; value: RoomExpireResult; plan: LazyExpiryPlan }
  | { kind: "error"; code: "NOT_ROOM_MEMBER" | "ROOM_NOT_EXPIRED" };

/**
 * api-contract › expireRoom: áp dụng hết hạn phòng (cùng logic lazy expiry, BR-04). Thứ tự lỗi: thành viên →
 * chưa quá `expires_at` (`ROOM_NOT_EXPIRED`). Idempotent: phòng đã `closing` (ván đang chạy) trả lại trạng thái hiện tại.
 */
export async function expireRoom(uid: string, input: ExpireRoomInput): Promise<RoomExpireResult> {
  const at = now();
  const outcome = await runTransaction<Outcome>(async (tx) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== input.roomId) return { kind: "error", code: "NOT_ROOM_MEMBER" };

    const plan = await planLazyExpiry(tx, { roomId: input.roomId, now: at });
    if (!plan.room) return { kind: "error", code: "NOT_ROOM_MEMBER" };
    if (plan.outcome === "none" && plan.room.status === "active") return { kind: "error", code: "ROOM_NOT_EXPIRED" };

    const game = plan.game ?? (await getGameInTx(tx, input.roomId, plan.room.currentGameId));
    plan.apply(tx);
    const gameStatus = plan.outcome === "none" ? (game?.status ?? null) : plan.gameStatus;
    if (!plan.status || !gameStatus) return { kind: "error", code: "NOT_ROOM_MEMBER" };
    return { kind: "ok", value: { roomStatus: plan.status, gameStatus }, plan };
  });

  if (outcome.kind === "error") throw new AppError(outcome.code);
  await outcome.plan.afterCommit();
  return outcome.value;
}
