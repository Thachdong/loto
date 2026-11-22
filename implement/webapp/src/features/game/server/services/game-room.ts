import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import type { ErrorDetail } from "@/core/shared/action-result";
import type { ErrorCode } from "@/core/shared/errors";
import { getUserInTx } from "@/features/auth/db/user.repository";
import type { GameRecord, RoomRecord } from "@/features/room/db/room.mapper";
import { getGameInTx, runTransaction } from "@/features/room/db/room.repository";
import { planLazyExpiry, type LazyExpiryPlan } from "@/features/room/server/services/room-expiry.service";

export type Failure = { kind: "error"; code: ErrorCode; details?: ErrorDetail[] };
export type Success<T> = { kind: "ok"; value: T };
export type Step<T> = Success<T> | Failure;

export const fail = (code: ErrorCode, details?: ErrorDetail[]): Failure => ({ kind: "error", code, details });
export const ok = <T>(value: T): Success<T> => ({ kind: "ok", value });

export type GameRoomContext = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  room: RoomRecord;
  game: GameRecord;
  at: Date;
  /** Kế hoạch lazy expiry (BR-04): `outcome !== "none"` → phòng vừa quá hạn. */
  plan: LazyExpiryPlan;
  /**
   * Gọi ngay trước lệnh ghi đầu tiên khi vẫn muốn thực hiện thao tác dù lazy expiry vừa đổi phòng
   * (VD pause/resume ván đang chạy → phòng `closing`). Bỏ qua nếu không có gì cần áp dụng.
   */
  applyExpiry(tx: Transaction): void;
};

type TxOutcome<T> = Step<T> & { plan: LazyExpiryPlan | null };

/**
 * Khung chung cho action trên ván: MỘT transaction, mọi đọc trước mọi ghi. Pha đọc chung: `users/{uid}` →
 * thành viên (`NOT_ROOM_MEMBER`) → `planLazyExpiry` → ván hiện tại; sau đó `body` đọc phần riêng rồi mới ghi.
 * Error-outcome pattern: `body` trả `fail(...)` thì phần hết hạn (nếu có) vẫn được ghi trong transaction rồi
 * lỗi nghiệp vụ mới được ném sau commit; `afterCommit` dọn presence. Phòng vừa bị lazy expiry ĐÓNG → lỗi
 * `options.expiredError` (mặc định `NOT_ROOM_MEMBER`; startGame dùng `ROOM_CLOSING`).
 */
export async function inGameRoom<T>(
  uid: string,
  roomId: string,
  body: (tx: Transaction, ctx: GameRoomContext) => Promise<Step<T>>,
  options: { expiredError?: ErrorCode } = {},
): Promise<T> {
  const at = now();
  const outcome = await runTransaction<TxOutcome<T>>(async (tx) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== roomId) return { ...fail("NOT_ROOM_MEMBER"), plan: null };

    const plan = await planLazyExpiry(tx, { roomId, now: at });
    const room = plan.room;
    if (!room || plan.status === "closed" || plan.status === null) {
      plan.apply(tx);
      const code = plan.outcome === "closed" ? (options.expiredError ?? "NOT_ROOM_MEMBER") : "NOT_ROOM_MEMBER";
      return { ...fail(code), plan };
    }
    const game = plan.game ?? (await getGameInTx(tx, roomId, room.currentGameId));
    if (!game) return { ...fail("NOT_ROOM_MEMBER"), plan: null };

    let applied = false;
    const applyExpiry = (t: Transaction) => {
      if (applied) return;
      applied = true;
      plan.apply(t);
    };
    const step = await body(tx, { uid, displayName: me.displayName, photoUrl: me.photoUrl, room, game, at, plan, applyExpiry });
    if (step.kind === "error") applyExpiry(tx);
    return { ...step, plan };
  });

  if (outcome.plan) await outcome.plan.afterCommit();
  if (outcome.kind === "error") throw new AppError(outcome.code, outcome.details);
  return outcome.value;
}
