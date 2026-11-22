import "server-only";

import { cryptoRandomInt } from "@/core/server/random";
import { t } from "@/core/shared/i18n/vi";
import { setRoomCalledNumbersInTx, setRoomEventInTx } from "@/features/room/db/room.repository";
import type { GameRecord } from "@/features/room/db/room.mapper";
import type { PauseGameInput } from "@/features/game/shared/schemas/pause-game";
import type { ResumeGameInput } from "@/features/game/shared/schemas/resume-game";
import type { StartGameInput } from "@/features/game/shared/schemas/start-game";
import type { GameState } from "@/features/game/shared/types";
import {
  startGameInTx,
  setGamePausedInTx,
  setGameRunningInTx,
} from "@/features/room/db/game.repository";
import {
  deletePlayersInTx,
  getPlayerStatusInTx,
  listPlayersInTx,
  updatePlayerProfilesInTx,
} from "@/features/ticket/db/ticket.repository";
import { pickNextNumber, type RandomInt } from "@/features/game/shared/domain/pick-next-number";
import { fail, inGameRoom, ok } from "./game-room";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function state(game: GameRecord, patch: Partial<GameState>): GameState {
  return {
    gameId: game.id,
    seqNo: game.seqNo,
    status: game.status,
    playerCount: game.playerCount,
    startedAt: iso(game.startedAt),
    nextCallAt: iso(game.nextCallAt),
    ...patch,
  };
}

export type StartGameDeps = { randomInt?: RandomInt };

/**
 * api-contract › startGame (BR-14, BR-15). Thứ tự lỗi: thành viên → host → `GAME_STALE` → `waiting` → phòng còn
 * `active` và chưa quá hạn (`ROOM_CLOSING`; lazy expiry vừa đóng/chuyển `closing` thì commit phần hết hạn rồi báo
 * `ROOM_CLOSING`) → 0 người có vé (`NO_TICKETS_HELD`, không ghi). Xóa player vé rỗng/đã rời, chép tên-ảnh hiện
 * tại, server rao ngay số đầu và đặt `next_call_at = now + N`.
 */
export async function startGame(uid: string, input: StartGameInput, deps: StartGameDeps = {}): Promise<GameState> {
  const randomInt = deps.randomInt ?? cryptoRandomInt;
  return inGameRoom<GameState>(uid, input.roomId, async (tx, ctx) => {
    const { room, game, at } = ctx;
    if (room.hostUid !== uid) return fail("NOT_ROOM_HOST");
    if (input.gameId !== room.currentGameId) return fail("GAME_STALE");
    if (game.status !== "waiting") return fail("GAME_NOT_WAITING");
    if (ctx.plan.outcome !== "none" || room.status !== "active") return fail("ROOM_CLOSING");

    const players = await listPlayersInTx(tx, input.roomId, game.id);
    const status = await getPlayerStatusInTx(
      tx,
      players.map((p) => p.uid),
    );
    const valid = players.filter((p) => p.ticketIds.length > 0 && status[p.uid]?.currentRoomId === input.roomId);
    if (valid.length === 0) return fail("NO_TICKETS_HELD");

    const invalid = players.filter((p) => !valid.includes(p));
    deletePlayersInTx(
      tx,
      input.roomId,
      game.id,
      invalid.map((p) => p.uid),
    );
    updatePlayerProfilesInTx(
      tx,
      input.roomId,
      game.id,
      valid.map((p) => ({
        uid: p.uid,
        displayName: status[p.uid].displayName,
        photoUrl: status[p.uid].photoUrl,
      })),
    );

    const first = pickNextNumber([], randomInt);
    const nextCallAt = new Date(at.getTime() + room.drawIntervalSec * 1000);
    startGameInTx(tx, input.roomId, game.id, { playerCount: valid.length, nextCallAt, now: at });
    setRoomCalledNumbersInTx(tx, input.roomId, first === null ? [] : [first], at, {
      type: "game_started",
      text: t("toast.gameStarted", { game: game.seqNo }),
      actorUid: uid,
      targetUid: null,
      now: at,
    });
    return ok(state(game, { status: "running", playerCount: valid.length, startedAt: at.toISOString(), nextCallAt: nextCallAt.toISOString() }));
  }, { expiredError: "ROOM_CLOSING" });
}

/** api-contract › pauseGame (BR-16). Thứ tự lỗi: thành viên → host → `GAME_STALE` → `GAME_NOT_RUNNING`. */
export async function pauseGame(uid: string, input: PauseGameInput): Promise<GameState> {
  return inGameRoom<GameState>(uid, input.roomId, async (tx, ctx) => {
    const { room, game, at } = ctx;
    if (room.hostUid !== uid) return fail("NOT_ROOM_HOST");
    if (input.gameId !== room.currentGameId) return fail("GAME_STALE");
    if (game.status !== "running") return fail("GAME_NOT_RUNNING");

    ctx.applyExpiry(tx);
    setGamePausedInTx(tx, input.roomId, game.id);
    setRoomEventInTx(tx, input.roomId, {
      type: "game_paused",
      text: t("toast.gamePaused"),
      actorUid: uid,
      targetUid: null,
      now: at,
    });
    return ok(state(game, { status: "paused", nextCallAt: null }));
  });
}

/**
 * api-contract › resumeGame. Thứ tự lỗi: thành viên → host → `GAME_STALE` → `GAME_NOT_PAUSED`. Phòng `closing`
 * vẫn tiếp tục được (ván đang diễn ra, BR-04).
 */
export async function resumeGame(uid: string, input: ResumeGameInput): Promise<GameState> {
  return inGameRoom<GameState>(uid, input.roomId, async (tx, ctx) => {
    const { room, game, at } = ctx;
    if (room.hostUid !== uid) return fail("NOT_ROOM_HOST");
    if (input.gameId !== room.currentGameId) return fail("GAME_STALE");
    if (game.status !== "paused") return fail("GAME_NOT_PAUSED");

    const nextCallAt = new Date(at.getTime() + room.drawIntervalSec * 1000);
    ctx.applyExpiry(tx);
    setGameRunningInTx(tx, input.roomId, game.id, nextCallAt);
    setRoomEventInTx(tx, input.roomId, {
      type: "game_resumed",
      text: t("toast.gameResumed"),
      actorUid: uid,
      targetUid: null,
      now: at,
    });
    return ok(state(game, { status: "running", nextCallAt: nextCallAt.toISOString() }));
  });
}
