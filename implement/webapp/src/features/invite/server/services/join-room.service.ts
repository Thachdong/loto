import "server-only";

import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { logError } from "@/core/server/log";
import type { ErrorCode } from "@/core/shared/errors";
import type { ErrorDetail } from "@/core/shared/action-result";
import { t } from "@/core/shared/i18n/vi";
import { getUserInTx, setCurrentRoomInTx } from "@/features/auth/db/user.repository";
import {
  addMemberInTx,
  findActiveRoomByJoinCodeInTx,
  findRoomByInviteCodeInTx,
  runTransaction,
  setPresenceAccess,
} from "@/features/room/db/room.repository";
import { planLazyExpiry, type LazyExpiryPlan } from "@/features/room/server/services/room-expiry.service";
import { MAX_MEMBERS } from "@/features/room/shared/constants";
import type { JoinRoomInput } from "@/features/invite/shared/schemas/join-room";
import type { JoinRoomResult } from "@/features/invite/shared/types";

type TxOutcome =
  | { kind: "joined"; roomId: string; alreadyMember: boolean; plans: LazyExpiryPlan[] }
  | { kind: "error"; code: ErrorCode; details?: ErrorDetail[]; plans: LazyExpiryPlan[] };

/**
 * api-contract › joinRoom (FLOW-03). Một transaction, mọi đọc trước mọi ghi. Khi đã có ghi (đóng phòng lười, BR-04)
 * mà vẫn phải trả lỗi, transaction trả `{ kind: "error" }` thay vì ném để phần đóng phòng được commit;
 * sau commit mới ném `AppError`. Thứ tự lỗi: không có phòng → đã ở phòng này → hết hạn/đóng → bị chặn →
 * đang ở phòng khác → đầy.
 */
export async function joinRoom(uid: string, input: JoinRoomInput): Promise<JoinRoomResult> {
  const at = now();
  const byInvite = "inviteCode" in input;
  // `roomCode`: mọi trường hợp phòng không mở được đều là ROOM_CODE_INVALID (không phân biệt để khó dò mã).
  const invalidCode: ErrorCode = byInvite ? "INVITE_INVALID" : "ROOM_CODE_INVALID";
  const expiredCode: ErrorCode = byInvite ? "INVITE_EXPIRED" : "ROOM_CODE_INVALID";

  const outcome = await runTransaction<TxOutcome>(async (tx) => {
    // ── Pha đọc ──
    const found = byInvite
      ? await findRoomByInviteCodeInTx(tx, input.inviteCode)
      : await findActiveRoomByJoinCodeInTx(tx, input.roomCode);
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (!found) return { kind: "error", code: invalidCode, plans: [] };

    if (me.currentRoomId === found.id) {
      return { kind: "joined", roomId: found.id, alreadyMember: true, plans: [] };
    }

    const target = await planLazyExpiry(tx, { roomId: found.id, now: at });
    const room = target.room ?? found;

    if (target.outcome !== "none") {
      target.apply(tx); // phòng active quá hạn: đóng lười rồi mới trả lỗi
      return { kind: "error", code: expiredCode, plans: [target] };
    }
    if (room.status !== "active" || at.getTime() >= room.inviteExpiresAt.getTime()) {
      return { kind: "error", code: expiredCode, plans: [] };
    }
    if (room.blockedUids.includes(uid)) return { kind: "error", code: "BLOCKED_FROM_ROOM", plans: [] };

    let current: LazyExpiryPlan | null = null;
    if (me.currentRoomId) {
      current = await planLazyExpiry(tx, { roomId: me.currentRoomId, now: at });
      if (current.status === "active" || current.status === "closing") {
        current.apply(tx); // lưu `closing` nếu vừa đến hạn
        return {
          kind: "error",
          code: "ALREADY_IN_ROOM",
          details: [{ code: "current_room", currentRoomId: me.currentRoomId }],
          plans: [current],
        };
      }
    }

    const plans = current ? [current] : [];
    if (room.memberCount >= MAX_MEMBERS) {
      current?.apply(tx); // không exceptUids: current_room_id của user cũng bị xóa nếu phòng cũ vừa đóng
      return { kind: "error", code: "ROOM_FULL", plans };
    }

    // ── Pha ghi ──
    current?.apply(tx, { exceptUids: [uid] }); // setCurrentRoomInTx ghi đè current_room_id
    setCurrentRoomInTx(tx, uid, room.id, at);
    addMemberInTx(tx, room.id, {
      memberCount: room.memberCount,
      uid,
      displayName: me.displayName,
      text: t("event.memberJoined", { name: me.displayName }),
      now: at,
    });
    return { kind: "joined", roomId: room.id, alreadyMember: false, plans };
  });

  for (const plan of outcome.plans) await plan.afterCommit();

  if (outcome.kind === "error") throw new AppError(outcome.code, outcome.details);

  if (!outcome.alreadyMember) {
    // RTDB không nằm trong transaction Firestore — lỗi chỉ log, vẫn trả thành công.
    try {
      await setPresenceAccess(outcome.roomId, uid);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      logError({ action: "joinRoom", code: "PRESENCE_ACCESS_FAILED", message: err.message, stack: err.stack });
    }
  }
  return { roomId: outcome.roomId, alreadyMember: outcome.alreadyMember };
}
