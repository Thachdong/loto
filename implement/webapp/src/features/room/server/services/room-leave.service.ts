import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { logError } from "@/core/server/log";
import { t } from "@/core/shared/i18n/vi";
import { clearCurrentRoomInTx, findUidsInRoomInTx, getUserInTx } from "@/features/auth/db/user.repository";
import {
  cancelGameInTx,
  closeRoomInTx,
  getGameInTx,
  removeMemberPresence,
  removeRoomPresence,
  runTransaction,
  setRoomMemberLeftInTx,
} from "@/features/room/db/room.repository";
import type { LeaveRoomInput } from "@/features/room/shared/schemas/leave-room";
import { deletePlayersInTx } from "@/features/ticket/db/ticket.repository";
import { planLazyExpiry, type LazyExpiryPlan } from "./room-expiry.service";

type Outcome =
  | { kind: "ok"; plan: LazyExpiryPlan; host: boolean }
  | { kind: "error"; plan: LazyExpiryPlan | null };

function logCleanup(error: unknown): void {
  const err = error instanceof Error ? error : new Error(String(error));
  logError({ action: "leaveRoom", code: "PRESENCE_CLEANUP_FAILED", message: err.message, stack: err.stack });
}

/**
 * api-contract › leaveRoom (BR-02, BR-11). Lazy expiry → thành viên (`NOT_ROOM_MEMBER`, kể cả khi phòng vừa
 * hết hạn). Player: `current_room_id = null`, `member_count − 1`, `last_event = member_left`; ván `waiting` xóa
 * doc player, ván khác GIỮ doc (vé bị hủy, `claims` giữ). Host: ván chưa kết thúc → `cancelled`, phòng `closed`
 * `host_left`, mọi người `current_room_id = null`. Sau commit xóa RTDB presence (lỗi chỉ log).
 */
export async function leaveRoom(uid: string, input: LeaveRoomInput): Promise<null> {
  const { roomId } = input;
  const at = now();

  const outcome = await runTransaction<Outcome>(async (tx: Transaction) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== roomId) return { kind: "error", plan: null };

    const plan = await planLazyExpiry(tx, { roomId, now: at });
    const room = plan.room;
    if (!room || plan.status === "closed" || plan.status === null) {
      plan.apply(tx);
      return { kind: "error", plan };
    }
    const game = plan.game ?? (await getGameInTx(tx, roomId, room.currentGameId));

    if (room.hostUid === uid) {
      const members = await findUidsInRoomInTx(tx, roomId);
      if (game && (game.status === "waiting" || game.status === "running" || game.status === "paused" || game.status === "awaiting_confirm")) {
        cancelGameInTx(tx, roomId, game.id, at);
      }
      closeRoomInTx(tx, roomId, { reason: "host_left", now: at, actorUid: uid, text: t("toast.hostLeft") });
      clearCurrentRoomInTx(tx, [...new Set([...members, uid])], at);
      return { kind: "ok", plan, host: true };
    }

    plan.apply(tx);
    if (game?.status === "waiting") deletePlayersInTx(tx, roomId, game.id, [uid]);
    clearCurrentRoomInTx(tx, [uid], at);
    setRoomMemberLeftInTx(tx, roomId, Math.max(0, room.memberCount - 1), {
      type: "member_left",
      text: t("toast.memberLeft", { name: me.displayName }),
      actorUid: uid,
      targetUid: null,
      now: at,
    });
    return { kind: "ok", plan, host: false };
  });

  if (outcome.plan) await outcome.plan.afterCommit();
  if (outcome.kind === "error") throw new AppError("NOT_ROOM_MEMBER");
  try {
    if (outcome.host) await removeRoomPresence(roomId);
    else await removeMemberPresence(roomId, uid);
  } catch (error) {
    logCleanup(error);
  }
  return null;
}
