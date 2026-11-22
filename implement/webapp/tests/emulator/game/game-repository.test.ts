import { beforeEach, describe, expect, it } from "vitest";
import {
  appendClaimInTx,
  appendDrawInTx,
  createNextGameInTx,
  finishGameInTx,
  newGameId,
  setGamePausedInTx,
  setGameRunningInTx,
  startGameInTx,
} from "@/features/room/db/game.repository";
import { claimFromDoc, type ClaimRecord } from "@/features/room/db/game.mapper";
import type { ClaimDoc } from "@/features/room/db/game.doc";
import { getGameInTx, runTransaction } from "@/features/room/db/room.repository";
import {
  copyPlayersInTx,
  deletePlayersInTx,
  getPlayerStatusInTx,
  listPlayersInTx,
} from "@/features/ticket/db/ticket.repository";
import { db, millis } from "../invite/invite-fixtures";
import { createCast, players, resetAll, writePlayer, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";
import { gameDoc, GAME, NOW, roomDoc, ROOM, SEC } from "./game-fixtures";

let cast: Cast;
const later = new Date(NOW.getTime() + 10 * SEC);

beforeEach(async () => {
  await resetAll();
  cast = await createCast();
  await writeTicketRoom(cast.H);
});

const claim = (uid: string, ticketId: ClaimRecord["ticketId"], result: "win" | "miss"): ClaimRecord => ({
  uid,
  displayName: uid,
  ticketId,
  color: "red",
  result,
  row: result === "win" ? 1 : null,
  claimedAt: NOW,
});

describe("game repository (in transaction)", () => {
  it("start → pause → resume → draw writes the expected fields", async () => {
    await runTransaction(async (tx) => startGameInTx(tx, ROOM, GAME, { playerCount: 2, nextCallAt: later, now: NOW }));
    expect(await gameDoc()).toMatchObject({ status: "running", player_count: 2, pause_reason: null });
    expect(millis((await gameDoc())?.next_call_at)).toBe(later.getTime());

    await runTransaction(async (tx) => setGamePausedInTx(tx, ROOM, GAME));
    expect(await gameDoc()).toMatchObject({ status: "paused", pause_reason: "host", next_call_at: null });

    await runTransaction(async (tx) => setGameRunningInTx(tx, ROOM, GAME, later));
    expect(await gameDoc()).toMatchObject({ status: "running", pause_reason: null });

    await runTransaction(async (tx) =>
      appendDrawInTx(tx, ROOM, GAME, { calledNumbers: [4, 9], nextCallAt: null, now: later }),
    );
    expect((await roomDoc())?.called_numbers).toEqual([4, 9]);
    expect((await gameDoc())?.next_call_at).toBeNull();
  });

  it("appendClaimInTx appends and optionally enters awaiting_confirm", async () => {
    await runTransaction(async (tx) => startGameInTx(tx, ROOM, GAME, { playerCount: 2, nextCallAt: later, now: NOW }));
    await runTransaction(async (tx) => {
      const game = await getGameInTx(tx, ROOM, GAME);
      appendClaimInTx(tx, ROOM, GAME, game?.claims ?? [], claim("u_b", "red_a", "miss"), { resumeStatus: "running" });
    });
    expect(await gameDoc()).toMatchObject({ status: "awaiting_confirm", resume_status: "running", next_call_at: null });

    await runTransaction(async (tx) => {
      const game = await getGameInTx(tx, ROOM, GAME);
      expect(game?.claims).toHaveLength(1);
      appendClaimInTx(tx, ROOM, GAME, game?.claims ?? [], claim("u_c", "red_b", "win"), null);
    });
    const game = await gameDoc();
    expect(game?.status).toBe("awaiting_confirm");
    const claims = (game?.claims as ClaimDoc[]).map(claimFromDoc);
    expect(claims.map((c) => [c.uid, c.result, c.row])).toEqual([
      ["u_b", "miss", null],
      ["u_c", "win", 1],
    ]);
  });

  it("finishGameInTx finishes with winners from win claims", async () => {
    await runTransaction(async (tx) => finishGameInTx(tx, ROOM, GAME, [claim("u_c", "red_b", "win")], later));
    expect(await gameDoc()).toMatchObject({ status: "finished", result: "won", next_call_at: null });
    expect((await gameDoc())?.winners).toHaveLength(1);
    await runTransaction(async (tx) => finishGameInTx(tx, ROOM, GAME, [], later));
    expect(await gameDoc()).toMatchObject({ result: "no_winner", winners: [] });
  });

  it("createNextGameInTx + copyPlayersInTx build the next waiting game and point the room to it", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    const nextId = newGameId(ROOM);
    await runTransaction(async (tx) => {
      const olds = await listPlayersInTx(tx, ROOM, GAME);
      createNextGameInTx(
        tx,
        ROOM,
        { gameId: nextId, seqNo: 2, roomCreatedAt: NOW, now: later },
        { type: "game_finished", text: "Ván 1 kết thúc", actorUid: null, targetUid: null, now: later },
      );
      copyPlayersInTx(tx, ROOM, nextId, olds, NOW, later);
    });
    expect(await roomDoc()).toMatchObject({ current_game_id: nextId, game_count: 2 });
    expect((await roomDoc())?.last_event).toMatchObject({ type: "game_finished", text: "Ván 1 kết thúc" });
    const next = (await db.doc(`rooms/${ROOM}/games/${nextId}`).get()).data();
    expect(next).toMatchObject({ seq_no: 2, status: "waiting", claims: [], player_count: 0, result: null });
    const copied = (await db.doc(`rooms/${ROOM}/games/${nextId}/players/${cast.B.uid}`).get()).data();
    expect(copied).toMatchObject({ display_name: "Bình B", ticket_ids: ["red_a"] });
    expect(millis(copied?.joined_at)).toBe(later.getTime());
  });

  it("getPlayerStatusInTx reads users; deletePlayersInTx removes player docs", async () => {
    await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
    await writePlayer(cast.X.uid, "Xuân X", ["green_a"]);
    await runTransaction(async (tx) => {
      const status = await getPlayerStatusInTx(tx, [cast.B.uid, cast.X.uid, "nobody"]);
      expect(status[cast.B.uid]).toEqual({ currentRoomId: ROOM, displayName: "Bình B", photoUrl: null });
      expect(status[cast.X.uid]?.currentRoomId).toBeNull();
      expect(status.nobody).toBeUndefined();
      expect(await getPlayerStatusInTx(tx, [])).toEqual({});
      deletePlayersInTx(tx, ROOM, GAME, [cast.X.uid]);
    });
    expect((await players().doc(cast.X.uid).get()).exists).toBe(false);
    expect((await players().doc(cast.B.uid).get()).exists).toBe(true);
  });
});
