import "server-only";

import { RESUME_REVEAL_MS } from "@/features/game/shared/domain/call-timing";
import { logError } from "@/core/server/log";
import { t } from "@/core/shared/i18n/vi";
import { clearCurrentRoomInTx, findUidsInRoomInTx } from "@/features/auth/db/user.repository";
import type { ConfirmGameInput } from "@/features/game/shared/schemas/confirm-game";
import type { RejectClaimsInput } from "@/features/game/shared/schemas/reject-claims";
import type { GameConfirmResult, GameState, Winner } from "@/features/game/shared/types";
import { confirmGameInTx, rejectClaimsInTx } from "@/features/room/db/game.repository";
import type { ClaimRecord } from "@/features/room/db/game.mapper";
import { closeRoomInTx, removeRoomPresence, setRoomEventInTx } from "@/features/room/db/room.repository";
import { readRoomPresence } from "@/features/ticket/db/ticket.repository";
import { fail, inGameRoom, ok } from "./game-room";
import { loadRolloverPlayers, rolloverToNewGame } from "./rollover.service";

const toWinner = (c: ClaimRecord): Winner => ({
  uid: c.uid,
  displayName: c.displayName,
  ticketId: c.ticketId,
  color: c.color,
  row: c.row ?? 0,
  claimedAt: c.claimedAt.toISOString(),
});

/**
 * api-contract › confirmGame (BR-28, BR-07, BR-11, BR-29). Thứ tự lỗi: thành viên → host → `GAME_STALE` →
 * `GAME_NOT_AWAITING_CONFIRM` → `NO_WINNING_CLAIM`. Phòng `active`: ván mới `waiting`, chép player còn trong phòng
 * và online (presence đọc TRƯỚC transaction). Phòng `closing`: đóng phòng, `nextGameId = null`. Phòng vừa bị lazy
 * expiry đóng (ván đã tự `finished`) → `GAME_NOT_AWAITING_CONFIRM`.
 */
export async function confirmGame(uid: string, input: ConfirmGameInput): Promise<GameConfirmResult> {
  const presence = await readRoomPresence(input.roomId).catch(() => ({}));
  return inGameRoom<GameConfirmResult>(
    uid,
    input.roomId,
    async (tx, ctx) => {
      const { room, game, at } = ctx;
      if (room.hostUid !== uid) return fail("NOT_ROOM_HOST");
      if (input.gameId !== room.currentGameId) return fail("GAME_STALE");
      if (game.status !== "awaiting_confirm") return fail("GAME_NOT_AWAITING_CONFIRM");
      const wins = game.claims.filter((c) => c.result === "win");
      if (wins.length === 0) return fail("NO_WINNING_CLAIM");
      const winners = wins.map(toWinner);

      if (ctx.plan.status === "closing") {
        const members = await findUidsInRoomInTx(tx, input.roomId);
        confirmGameInTx(tx, input.roomId, game.id, game.claims, uid, at);
        closeRoomInTx(tx, input.roomId, { reason: "expired", now: at });
        clearCurrentRoomInTx(tx, members, at);
        ctx.afterCommit(async () => {
          try {
            await removeRoomPresence(input.roomId);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError({ action: "confirmGame", code: "PRESENCE_CLEANUP_FAILED", message: err.message, stack: err.stack });
          }
        });
        return ok({ finishedGameId: game.id, result: "won", winners, nextGameId: null, roomStatus: "closed" });
      }

      const carried = await loadRolloverPlayers(tx, input.roomId, game.id, presence);
      ctx.applyExpiry(tx);
      confirmGameInTx(tx, input.roomId, game.id, game.claims, uid, at);
      const nextGameId = rolloverToNewGame(tx, {
        room,
        finishedGame: game,
        carried,
        now: at,
        event: {
          type: "game_finished",
          text: t("result.summary", { game: game.seqNo, k: winners.length }),
          actorUid: uid,
          targetUid: null,
          now: at,
        },
      });
      return ok({ finishedGameId: game.id, result: "won", winners, nextGameId, roomStatus: "active" });
    },
    { expiredError: "GAME_NOT_AWAITING_CONFIRM" },
  );
}

/**
 * api-contract › rejectClaims (BR-28, Q-055). Thứ tự lỗi: thành viên → host → `GAME_STALE` →
 * `GAME_NOT_AWAITING_CONFIRM` → `CLAIM_HAS_WIN`. Ván về `resume_status`; không lưu lượt hụt (Q-031).
 */
export async function rejectClaims(uid: string, input: RejectClaimsInput): Promise<GameState> {
  return inGameRoom<GameState>(
    uid,
    input.roomId,
    async (tx, ctx) => {
      const { room, game, at } = ctx;
      if (room.hostUid !== uid) return fail("NOT_ROOM_HOST");
      if (input.gameId !== room.currentGameId) return fail("GAME_STALE");
      if (game.status !== "awaiting_confirm") return fail("GAME_NOT_AWAITING_CONFIRM");
      if (game.claims.some((c) => c.result === "win")) return fail("CLAIM_HAS_WIN");

      const names = [...new Set(game.claims.map((c) => c.displayName))].join(", ");
      const resumeTo = game.resumeStatus === "paused" ? "paused" : "running";
      const nextCallAt = resumeTo === "running" ? new Date(at.getTime() + RESUME_REVEAL_MS) : null;
      ctx.applyExpiry(tx);
      rejectClaimsInTx(tx, input.roomId, game.id, nextCallAt ? { status: "running", nextCallAt } : { status: "paused" });
      setRoomEventInTx(tx, input.roomId, {
        type: "claims_rejected",
        text: t("toast.claimsRejected", { names }),
        actorUid: uid,
        targetUid: null,
        now: at,
      });
      return ok({
        gameId: game.id,
        seqNo: game.seqNo,
        status: resumeTo,
        playerCount: game.playerCount,
        startedAt: game.startedAt ? game.startedAt.toISOString() : null,
        nextCallAt: nextCallAt ? nextCallAt.toISOString() : null,
      });
    },
    { expiredError: "GAME_NOT_AWAITING_CONFIRM" },
  );
}
