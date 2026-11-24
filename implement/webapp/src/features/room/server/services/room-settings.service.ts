import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import type { ErrorCode } from "@/core/shared/errors";
import { t } from "@/core/shared/i18n/vi";
import { getUserInTx } from "@/features/auth/db/user.repository";
import { runTransaction, setDrawIntervalInTx } from "@/features/room/db/room.repository";
import { isValidDrawInterval } from "@/features/room/shared/domain/draw-interval";
import type { UpdateRoomInput } from "@/features/room/shared/schemas/update-room";
import type { RoomSettings } from "@/features/room/shared/types";
import { planLazyExpiry, type LazyExpiryPlan } from "./room-expiry.service";

type Outcome = { kind: "ok"; plan: LazyExpiryPlan } | { kind: "error"; code: ErrorCode; plan: LazyExpiryPlan | null };

/**
 * api-contract › updateRoom (BR-15). 3–15 → transaction: thành viên (kể cả phòng vừa hết hạn) → host → ghi
 * `draw_interval_sec` + `last_event = interval_changed`. Không đụng `games.next_call_at` (nhịp mới áp dụng từ lần
 * `drawNumber` kế tiếp — ADR-05). Giá trị không đổi → trả 200, không ghi.
 */
export async function updateRoom(uid: string, input: UpdateRoomInput): Promise<RoomSettings> {
  const { roomId, drawIntervalSec } = input;
  if (!isValidDrawInterval(drawIntervalSec)) throw new AppError("DRAW_INTERVAL_INVALID");
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

    if (room.drawIntervalSec !== drawIntervalSec) {
      setDrawIntervalInTx(tx, roomId, drawIntervalSec, {
        type: "interval_changed",
        text: t("toast.intervalChanged", { n: drawIntervalSec }),
        actorUid: uid,
        targetUid: null,
        now: at,
      });
    }
    return { kind: "ok", plan };
  });

  if (outcome.plan) await outcome.plan.afterCommit();
  if (outcome.kind === "error") throw new AppError(outcome.code);
  return { roomId, drawIntervalSec };
}
