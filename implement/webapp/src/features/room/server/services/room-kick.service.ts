import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { logError } from "@/core/server/log";
import type { ErrorCode } from "@/core/shared/errors";
import { clearCurrentRoomInTx, getUserInTx } from "@/features/auth/db/user.repository";
import { getGameInTx, kickMemberInTx, removeMemberPresence, runTransaction } from "@/features/room/db/room.repository";
import type { KickPlayerInput } from "@/features/room/shared/schemas/kick-player";
import type { KickResult } from "@/features/room/shared/types";
import { deletePlayerInTx, getPlayerInTx, getPlayerStatusInTx } from "@/features/ticket/db/ticket.repository";
import { planLazyExpiry, type LazyExpiryPlan } from "./room-expiry.service";

type Outcome = { kind: "ok"; value: KickResult; plan: LazyExpiryPlan } | { kind: "error"; code: ErrorCode; plan: LazyExpiryPlan | null };

/**
 * api-contract › kickPlayer (BR-06, BR-21, BR-22, Q-048). Thứ tự lỗi: thành viên (kể cả phòng vừa hết hạn) →
 * host → không phải chính mình → đích có doc player ở ván hiện tại và còn trong phòng. Ghi: `blocked_uids`,
 * `member_count − 1`, `last_event = member_kicked` (`text` = tên đích), `users/{uid}.current_room_id = null`;
 * ván `waiting` xóa doc player, ván khác GIỮ (vé khóa tới hết ván). Sau commit xóa RTDB presence (lỗi chỉ log).
 */
export async function kickPlayer(uid: string, input: KickPlayerInput): Promise<KickResult> {
  const { roomId, uid: targetUid } = input;
  const at = now();

  const outcome = await runTransaction<Outcome>(async (tx: Transaction) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== roomId) return { kind: "error", code: "NOT_ROOM_MEMBER", plan: null };

    const plan = await planLazyExpiry(tx, { roomId, now: at });
    const room = plan.room;
    if (!room || plan.status === "closed" || plan.status === null) {
      plan.apply(tx);
      return { kind: "error", code: "NOT_ROOM_MEMBER", plan };
    }
    const game = plan.game ?? (await getGameInTx(tx, roomId, room.currentGameId));
    const fail = (code: ErrorCode): Outcome => {
      plan.apply(tx);
      return { kind: "error", code, plan };
    };
    if (room.hostUid !== uid) return fail("NOT_ROOM_HOST");
    if (targetUid === uid) return fail("CANNOT_TARGET_SELF");
    if (!game) return fail("PLAYER_NOT_FOUND");

    const target = await getPlayerInTx(tx, roomId, game.id, targetUid);
    const status = (await getPlayerStatusInTx(tx, [targetUid]))[targetUid];
    if (!target || status?.currentRoomId !== roomId) return fail("PLAYER_NOT_FOUND");

    plan.apply(tx);
    const waiting = game.status === "waiting";
    if (waiting) deletePlayerInTx(tx, roomId, game.id, targetUid);
    clearCurrentRoomInTx(tx, [targetUid], at);
    kickMemberInTx(tx, roomId, targetUid, Math.max(0, room.memberCount - 1), {
      type: "member_kicked",
      text: status.displayName,
      actorUid: uid,
      targetUid,
      now: at,
    });
    return { kind: "ok", value: { uid: targetUid, ticketsFreedNow: waiting, gameStatus: game.status }, plan };
  });

  if (outcome.plan) await outcome.plan.afterCommit();
  if (outcome.kind === "error") throw new AppError(outcome.code);
  try {
    await removeMemberPresence(roomId, targetUid);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError({ action: "kickPlayer", code: "PRESENCE_CLEANUP_FAILED", message: err.message, stack: err.stack });
  }
  return outcome.value;
}
