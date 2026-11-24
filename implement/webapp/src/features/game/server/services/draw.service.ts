import "server-only";

import { AppError } from "@/core/server/action";
import { cryptoRandomInt } from "@/core/server/random";
import { t } from "@/core/shared/i18n/vi";
import { clearCurrentRoomInTx, findUidsInRoomInTx } from "@/features/auth/db/user.repository";
import { MAX_NUMBER } from "@/features/game/shared/constants";
import { pickNextNumber, type RandomInt } from "@/features/game/shared/domain/pick-next-number";
import type { DrawNumberInput } from "@/features/game/shared/schemas/draw-number";
import type { DrawResult } from "@/features/game/shared/types";
import { resultOfClaims } from "@/features/room/db/game.mapper";
import { appendDrawInTx, finishGameInTx } from "@/features/room/db/game.repository";
import { finishAndCloseInTx, removeRoomPresence } from "@/features/room/db/room.repository";
import { getPlayerInTx, readRoomPresence } from "@/features/ticket/db/ticket.repository";
import { logError } from "@/core/server/log";
import { fail, inGameRoom, ok } from "./game-room";
import { loadRolloverPlayers, rolloverToNewGame } from "./rollover.service";

/** Sai số cho phép giữa đồng hồ client và `next_call_at` (plan 3.3). */
export const DRAW_TOLERANCE_MS = 300;

export type DrawDeps = { randomInt?: RandomInt };

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/**
 * api-contract › drawNumber (BR-14, BR-15). Thứ tự lỗi: thành viên → `GAME_STALE` → (host hoặc có doc player,
 * `NOT_ROOM_MEMBER`) → `GAME_NOT_RUNNING` → `seq ≠ số đã rao` ⇒ `drawn:false` → `DRAW_TOO_EARLY`.
 * Số thứ 90: ván `finished`/`no_winner`; phòng `active` → ván mới (`rolloverToNewGame`), `closing` → đóng phòng.
 */
export async function drawNumber(uid: string, input: DrawNumberInput, deps: DrawDeps = {}): Promise<DrawResult> {
  const randomInt = deps.randomInt ?? cryptoRandomInt;
  const log: { role: "host" | "backup" | null; drawn: boolean; code: string | null } = {
    role: null,
    drawn: false,
    code: null,
  };
  // BR-29: presence đọc TRƯỚC transaction; chỉ cần khi có thể là số thứ 90.
  const presence = input.seq === MAX_NUMBER - 1 ? await readRoomPresence(input.roomId).catch(() => ({})) : {};

  try {
    const result = await inGameRoom<DrawResult>(uid, input.roomId, async (tx, ctx) => {
      const { room, game, at } = ctx;
      if (input.gameId !== room.currentGameId) return fail("GAME_STALE");

      const isHost = room.hostUid === uid;
      log.role = isHost ? "host" : "backup";
      if (!isHost && !(await getPlayerInTx(tx, input.roomId, game.id, uid))) return fail("NOT_ROOM_MEMBER");
      if (game.status !== "running") return fail("GAME_NOT_RUNNING");

      const called = room.calledNumbers;
      if (input.seq !== called.length) {
        return ok({
          drawn: false,
          number: called.length > 0 ? called[called.length - 1] : null,
          seq: called.length,
          nextCallAt: iso(game.nextCallAt),
          gameStatus: game.status,
        });
      }
      if (game.nextCallAt && at.getTime() < game.nextCallAt.getTime() - DRAW_TOLERANCE_MS) {
        return fail("DRAW_TOO_EARLY", [{ code: "nextCallAt", nextCallAt: game.nextCallAt.toISOString() }]);
      }

      const picked = pickNextNumber(called, randomInt);
      if (picked === null) return fail("GAME_NOT_RUNNING");
      const calledNumbers = [...called, picked];
      const last = calledNumbers.length >= MAX_NUMBER;
      const draw = { calledNumbers, now: at };

      if (!last) {
        const nextCallAt = new Date(at.getTime() + room.drawIntervalSec * 1000);
        ctx.applyExpiry(tx);
        appendDrawInTx(tx, input.roomId, game.id, { ...draw, nextCallAt });
        log.drawn = true;
        return ok({ drawn: true, number: picked, seq: calledNumbers.length, nextCallAt: nextCallAt.toISOString(), gameStatus: "running" });
      }

      // Số thứ 90: ván kết thúc không người thắng.
      if (ctx.plan.status === "closing") {
        const members = await findUidsInRoomInTx(tx, input.roomId);
        appendDrawInTx(tx, input.roomId, game.id, { ...draw, nextCallAt: null });
        finishAndCloseInTx(tx, input.roomId, game.id, resultOfClaims(game.claims), { reason: "expired", now: at });
        clearCurrentRoomInTx(tx, members, at);
        ctx.afterCommit(async () => {
          try {
            await removeRoomPresence(input.roomId);
          } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logError({ action: "drawNumber", code: "PRESENCE_CLEANUP_FAILED", message: err.message, stack: err.stack });
          }
        });
      } else {
        const carried = await loadRolloverPlayers(tx, input.roomId, game.id, presence);
        appendDrawInTx(tx, input.roomId, game.id, { ...draw, nextCallAt: null });
        finishGameInTx(tx, input.roomId, game.id, game.claims, at);
        rolloverToNewGame(tx, {
          room,
          finishedGame: game,
          carried,
          now: at,
          event: {
            type: "game_finished",
            text: t("toast.gameFinished", { game: game.seqNo }),
            actorUid: null,
            targetUid: null,
            now: at,
          },
        });
      }
      log.drawn = true;
      return ok({ drawn: true, number: picked, seq: MAX_NUMBER, nextCallAt: null, gameStatus: "finished" });
    });
    return result;
  } catch (error) {
    if (error instanceof AppError) log.code = error.code;
    throw error;
  } finally {
    console.info(
      JSON.stringify({
        op: "drawNumber",
        roomId: input.roomId,
        gameId: input.gameId,
        uid,
        role: log.role,
        seq: input.seq,
        drawn: log.drawn,
        code: log.code,
      }),
    );
  }
}
