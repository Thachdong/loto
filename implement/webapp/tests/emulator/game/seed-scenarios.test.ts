import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { getFirestore } from "firebase-admin/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getAdminApp } from "@/core/server/firebase-admin";
import { checkClaim } from "@/features/game/shared/domain/check-claim";
import { resetAll } from "../ticket/ticket-fixtures";

const tsx = resolve(process.cwd(), "node_modules/.bin/tsx");
const seedScript = resolve(process.cwd(), "scripts/seed/index.ts");
const db = getFirestore(getAdminApp());

const run = (scenario: string) => spawnSync(tsx, [seedScript, scenario], { env: process.env, encoding: "utf8" });
const read = async (roomId: string) => {
  const room = (await db.doc(`rooms/${roomId}`).get()).data();
  const game = (await db.doc(`rooms/${roomId}/games/${room?.current_game_id}`).get()).data();
  return { room, game };
};

// Auth emulator còn user (cùng email, khác uid) từ test khác → seedUser sẽ lỗi nếu không dọn trước.
beforeAll(resetAll);

afterAll(() => {
  run("reset");
});

/** [scenario, roomId, roomStatus, gameStatus] — plan T-006 mục 3.4. */
const CASES: [string, string, string, string][] = [
  ["game-waiting", "r_gm_wait", "active", "waiting"],
  ["t006", "r_gm_wait", "active", "waiting"],
  ["game-empty", "r_gm_empty", "active", "waiting"],
  ["game-running", "r_gm_run", "active", "running"],
  ["game-row-ready", "r_gm_row", "active", "running"],
  ["game-paused", "r_gm_pause", "active", "paused"],
  ["game-awaiting", "r_gm_await", "active", "awaiting_confirm"],
  ["game-nearly-done", "r_gm_near", "active", "running"],
  ["game-nearly-done-closing", "r_gm_nearc", "closing", "running"],
  ["game-near-expiry", "r_gm_nexp", "active", "waiting"],
  ["game-expiring-waiting", "r_gm_expw", "active", "waiting"],
  ["game-expiring-running", "r_gm_expr", "active", "running"],
  ["game-expired-idle", "r_gm_idle", "active", "waiting"],
  ["game-awaiting-expiring", "r_gm_awexp", "active", "awaiting_confirm"],
  ["result-awaiting-win", "r_rs_win", "active", "awaiting_confirm"],
  ["result-awaiting-miss", "r_rs_miss", "active", "awaiting_confirm"],
  ["result-host-offline", "r_rs_off", "active", "awaiting_confirm"],
  ["history", "r_hist", "active", "waiting"],
];

describe("T-006 seed scenarios", () => {
  for (const [scenario, roomId, roomStatus, gameStatus] of CASES) {
    it(`${scenario} → room ${roomStatus}, game ${gameStatus}, draw_interval_sec 3`, async () => {
      const result = run(scenario);
      expect(result.status, result.stderr).toBe(0);
      const { room, game } = await read(roomId);
      expect(room).toMatchObject({ status: roomStatus, draw_interval_sec: 3, member_count: 3 });
      expect(game?.status).toBe(gameStatus);
    });
  }

  it("game-running: 5 numbers called, next_call_at ≈ now + 3s; B red_a, C blue_a + blue_b", async () => {
    run("game-running");
    const { room, game } = await read("r_gm_run");
    expect(room?.called_numbers).toHaveLength(5);
    const delta = game?.next_call_at.toMillis() - Date.now();
    expect(delta).toBeGreaterThan(0);
    expect(delta).toBeLessThanOrEqual(3000);
    const players = await db.collection("rooms/r_gm_run/games/" + room?.current_game_id + "/players").get();
    expect(Object.fromEntries(players.docs.map((d) => [d.id, d.data().ticket_ids]))).toEqual({
      u_tk_b: ["red_a"],
      u_tk_c: ["blue_a", "blue_b"],
    });
  });

  it("game-row-ready: blue_a row 0 complete, red_a has no complete row", async () => {
    run("game-row-ready");
    const { room } = await read("r_gm_row");
    const grid = async (id: string) => (await db.doc(`rooms/r_gm_row/tickets/${id}`).get()).data()?.grid as number[];
    expect(checkClaim(await grid("blue_a"), room?.called_numbers)).toEqual({ win: true, row: 0 });
    expect(checkClaim(await grid("red_a"), room?.called_numbers).win).toBe(false);
  });

  it("game-awaiting: claims = [C blue_a win row 0], resume_status running; nearly-done has 89 numbers; expired-idle is past expires_at", async () => {
    run("game-awaiting");
    const { game } = await read("r_gm_await");
    expect(game).toMatchObject({ resume_status: "running", next_call_at: null });
    expect(game?.claims).toHaveLength(1);
    expect(game?.claims[0]).toMatchObject({ uid: "u_tk_c", ticket_id: "blue_a", result: "win", row: 0 });
    run("game-nearly-done");
    expect((await read("r_gm_near")).room?.called_numbers).toHaveLength(89);
    run("game-expired-idle");
    expect((await read("r_gm_idle")).room?.expires_at.toMillis()).toBeLessThan(Date.now());
  });

  it("history (T-010): games 1–4 finished/cancelled mapped to cards newest-first, current game 5 waiting excluded", async () => {
    run("history");
    const { mapHistoryDoc } = await import("@/features/history/client/hooks/use-game-history");
    const { sortHistory, toHistoryCard } = await import("@/features/history/shared/domain/history-card");
    const snap = await db.collection("rooms/r_hist/games").get();
    const games = sortHistory(snap.docs.map((d) => mapHistoryDoc(d.data(), d.id)).filter((g) => g !== null));
    const cards = games.map((g) => toHistoryCard(g));
    expect(cards.map((c) => [c.seqNo, c.outcome])).toEqual([
      [4, "cancelled"],
      [3, "no_winner"],
      [2, "won"],
      [1, "won"],
    ]);
    expect(cards[0].time).toEqual({ kind: "cancelled", at: "23:33" });
    expect(cards[2].winners.map((w) => w.ticketId)).toEqual(["red_a", "blue_b"]);
    expect(cards[3].time).toEqual({ kind: "range", from: "23:00", to: "23:08" });
  });

  it("room-members (T-009): 4 members, Bình red_a + Chi blue_b, waiting", async () => {
    const result = run("room-members");
    expect(result.status, result.stderr).toBe(0);
    const { room, game } = await read("r_members");
    expect(room).toMatchObject({ host_uid: "u_mb_an", member_count: 4, status: "active" });
    expect(game?.status).toBe("waiting");
    const players = await db.collection(`rooms/r_members/games/${room?.current_game_id}/players`).get();
    expect(Object.fromEntries(players.docs.map((d) => [d.id, d.data().ticket_ids]))).toEqual({ u_mb_binh: ["red_a"], u_mb_chi: ["blue_b"] });
  });

  it("chat-history (T-008): 120 messages, pages of 50 newest-first reach message 1", async () => {
    const result = run("chat-history");
    expect(result.status, result.stderr).toBe(0);
    const col = db.collection("rooms/r_chat/messages").orderBy("created_at");
    expect((await col.get()).size).toBe(120);
    const last = await col.limitToLast(50).get();
    expect(last.docs[0].data().text).toBe("Tin số 71");
    const page2 = await col.endBefore(last.docs[0].data().created_at).limitToLast(50).get();
    expect(page2.docs[0].data().text).toBe("Tin số 21");
    const page3 = await col.endBefore(page2.docs[0].data().created_at).limitToLast(50).get();
    expect(page3.size).toBe(20);
    expect(page3.docs[0].data().text).toBe("Tin số 1");
    expect((await db.doc("users/u_ch_chi").get()).data()?.current_room_id).toBeNull();
  });

  it("existing scenarios keep their defaults (tickets-basic: draw_interval_sec 5, no called numbers)", async () => {
    run("tickets-basic");
    const { room, game } = await read("r_tk_basic");
    expect(room).toMatchObject({ draw_interval_sec: 5, called_numbers: [], last_event: null });
    expect(game).toMatchObject({ claims: [], next_call_at: null, player_count: 0, resume_status: null });
  });
});
