import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { logError } from "@/core/server/log";
import { clearCurrentRoomInTx, findUidsInRoomInTx } from "@/features/auth/db/user.repository";
import { resultOfClaims } from "@/features/room/db/game.mapper";
import {
  cancelGameInTx,
  closeRoomExpiredInTx,
  finishAndCloseInTx,
  getGameInTx,
  getRoomInTx,
  markRoomClosingInTx,
  removeRoomPresence,
} from "@/features/room/db/room.repository";
import type { GameRecord, RoomRecord } from "@/features/room/db/room.mapper";
import { decideExpiry } from "@/features/room/shared/domain/decide-expiry";
import type { GameStatus, RoomStatus } from "@/features/room/shared/types";

export type LazyExpiryContext = { roomId: string; now: Date };

/** `none`: không đổi gì · `closed`: đã đóng phòng · `closing`: chờ ván đang diễn ra kết thúc. */
export type LazyExpiryOutcome = "none" | "closed" | "closing";

export type LazyExpiryApplyOptions = {
  /** Không xóa `current_room_id` của các uid này (người gọi tự ghi giá trị mới, VD vừa tạo phòng khác). */
  exceptUids?: readonly string[];
};

/** Kết quả pha đọc — người gọi tự quyết thời điểm ghi (mọi `tx.get` phải trước mọi ghi). */
export type LazyExpiryPlan = {
  /** Phòng như đã đọc (trước khi áp dụng), null khi không tồn tại. */
  room: RoomRecord | null;
  /** Ván hiện tại như đã đọc (trước khi áp dụng); null khi chưa đọc (phòng chưa tới hạn) hoặc không tồn tại. */
  game: GameRecord | null;
  outcome: LazyExpiryOutcome;
  /** Trạng thái phòng sau khi áp dụng, null khi phòng không tồn tại. */
  status: RoomStatus | null;
  /** Trạng thái ván sau khi áp dụng, null khi chưa đọc ván. */
  gameStatus: GameStatus | null;
  /** uid có `current_room_id == roomId` (chỉ đọc khi `outcome = closed`). */
  memberUids: string[];
  /** Pha ghi — gọi trong cùng transaction, sau mọi lệnh đọc. */
  apply(tx: Transaction, options?: LazyExpiryApplyOptions): void;
  /** Sau commit: xóa RTDB presence khi phòng đã đóng. Không ném lỗi. */
  afterCommit(): Promise<void>;
};

const noop = async () => undefined;

/**
 * Pha ĐỌC của lazy expiry (BR-04, ADR-05) theo `decideExpiry`:
 * - `mark_closing` (ván `running`/`paused`): phòng `closing`, `last_event = room_closing`;
 * - `cancel_and_close` (ván `waiting`/không còn ván chưa kết thúc): ván `waiting` → `cancelled`, phòng `closed`;
 * - `finish_and_close` (ván `awaiting_confirm`): ván `finished` (`winners` = claims `win`, `result = won`;
 *   không có → `no_winner`), phòng `closed`;
 * - `close` (phòng `closing` mà ván đã `finished`/`cancelled`): phòng `closed`.
 * Đóng phòng: `close_reason = expired`, `member_count = 0`, `last_event = room_closed`, mọi thành viên
 * `current_room_id = null`; sau commit xóa `presence/{roomId}`, `presence_access/{roomId}`.
 */
export async function planLazyExpiry(tx: Transaction, ctx: LazyExpiryContext): Promise<LazyExpiryPlan> {
  const { roomId, now } = ctx;
  const room = await getRoomInTx(tx, roomId);
  const unchanged = (game: GameRecord | null = null): LazyExpiryPlan => ({
    room,
    game,
    outcome: "none",
    status: room?.status ?? null,
    gameStatus: game?.status ?? null,
    memberUids: [],
    apply: () => undefined,
    afterCommit: noop,
  });

  if (!room || room.status === "closed") return unchanged();
  if (room.status === "active" && now.getTime() < room.expiresAt.getTime()) return unchanged();

  const game = await getGameInTx(tx, roomId, room.currentGameId);
  const decision = decideExpiry({
    roomStatus: room.status,
    gameStatus: game?.status ?? null,
    now,
    expiresAt: room.expiresAt,
  });

  if (decision === "none") return unchanged(game);

  if (decision === "mark_closing") {
    return {
      room,
      game,
      outcome: "closing",
      status: "closing",
      gameStatus: game?.status ?? null,
      memberUids: [],
      apply: (t) => markRoomClosingInTx(t, roomId, now),
      afterCommit: noop,
    };
  }

  const memberUids = await findUidsInRoomInTx(tx, roomId);
  const gameStatusAfter: GameStatus | null =
    decision === "finish_and_close"
      ? "finished"
      : decision === "cancel_and_close" && game?.status === "waiting"
        ? "cancelled"
        : (game?.status ?? null);
  return {
    room,
    game,
    outcome: "closed",
    status: "closed",
    gameStatus: gameStatusAfter,
    memberUids,
    apply: (t, options = {}) => {
      if (decision === "finish_and_close" && game) {
        finishAndCloseInTx(t, roomId, game.id, resultOfClaims(game.claims), { reason: "expired", now });
      } else {
        if (decision === "cancel_and_close" && game?.status === "waiting") cancelGameInTx(t, roomId, game.id, now);
        closeRoomExpiredInTx(t, roomId, now);
      }
      const keep = new Set(options.exceptUids ?? []);
      clearCurrentRoomInTx(
        t,
        memberUids.filter((uid) => !keep.has(uid)),
        now,
      );
    },
    afterCommit: async () => {
      try {
        await removeRoomPresence(roomId);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logError({ action: "lazyExpiry", code: "PRESENCE_CLEANUP_FAILED", message: err.message, stack: err.stack });
      }
    },
  };
}

/**
 * Đọc + ghi ngay lazy expiry trong transaction được truyền vào — dùng khi người gọi **không còn lệnh đọc nào**
 * sau bước này (T-004/T-006/T-007). Người gọi cần đọc thêm → dùng `planLazyExpiry` rồi `plan.apply(tx)`.
 * Nhớ gọi `plan.afterCommit()` sau khi transaction commit.
 */
export async function applyLazyExpiry(
  tx: Transaction,
  ctx: LazyExpiryContext,
  options?: LazyExpiryApplyOptions,
): Promise<LazyExpiryPlan> {
  const plan = await planLazyExpiry(tx, ctx);
  plan.apply(tx, options);
  return plan;
}
