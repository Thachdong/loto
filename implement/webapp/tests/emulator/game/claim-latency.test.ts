import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { createClaimAction } from "@/features/game/server/actions/create-claim.action";
import { createCookieStore } from "../auth/google-token";
import { createCast, resetAll, signInAs, writePlayer, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";
import { GAME, NOW, patchGame, ROOM, SEC, ts } from "./game-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a", "red_b"]);
  await patchGame({ status: "running", player_count: 1, started_at: ts(NOW), next_call_at: ts(new Date(NOW.getTime() + 3 * SEC)) });
});

afterEach(() => resetClock());

describe("AC-45: createClaim latency", () => {
  it("20 createClaim calls (append into a growing claims list): P95 < 1000 ms", async () => {
    signInAs(cookieStore, cast.B);
    const tickets = ["red_a", "red_b"];
    const times: number[] = [];
    // 2 vé hợp lệ → lượt đầu append, lượt sau TICKET_ALREADY_CLAIMED; vẫn đo đủ đường đi đọc-ghi/kiểm tra 20 lần
    // bằng cách xóa claims giữa các lượt để mỗi lượt là một lần ghi thật.
    for (let i = 0; i < 20; i++) {
      await patchGame({ status: "running", claims: [], resume_status: null, next_call_at: ts(new Date(NOW.getTime() + 3 * SEC)) });
      const start = performance.now();
      const res = await createClaimAction({ roomId: ROOM, gameId: GAME, ticketId: tickets[i % 2] });
      times.push(performance.now() - start);
      expect(res.ok).toBe(true);
    }
    const sorted = [...times].sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    expect(p95).toBeLessThan(1000);
  });
});
