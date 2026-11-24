import { checkClaim } from "@/features/game/shared/domain/check-claim";
import { generateTicketSet, seededRng } from "@/features/room/shared/domain/generate-ticket-set";
import type { GameStatus, RoomStatus } from "@/features/room/shared/types";
import { seedRoom, type SeedClaim, type SeedLastEvent, type SeedPlayer } from "../lib/seed-room";
import { seedUser } from "../lib/seed-user";
import { seedUserDoc } from "../lib/seed-user-doc";

const H = { uid: "u_tk_h", email: "h@example.com", name: "Host H" };
const B = { uid: "u_tk_b", email: "b@example.com", name: "Bình B" };
const C = { uid: "u_tk_c", email: "c@example.com", name: "Cúc C" };
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

async function person(p: typeof H, currentRoomId: string): Promise<void> {
  await seedUser({ uid: p.uid, email: p.email, name: p.name });
  await seedUserDoc({
    uid: p.uid,
    email: p.email,
    googleName: p.name,
    displayName: p.name,
    profileCustomized: false,
    currentRoomId,
  });
}

const holders = (): SeedPlayer[] => [
  { uid: B.uid, displayName: B.name, ticketIds: ["red_a"] },
  { uid: C.uid, displayName: C.name, ticketIds: ["blue_a", "blue_b"] },
];

type Options = {
  roomId: string;
  joinCode: string;
  inviteCode: string;
  name: string;
  rngSeed?: number;
  players?: SeedPlayer[];
  gameStatus?: GameStatus;
  roomStatus?: RoomStatus;
  /** expires_at − now (ms); mặc định +8 giờ. */
  expiresIn?: number;
  calledNumbers?: number[];
  nextCall?: boolean;
  pauseReason?: "host" | null;
  claims?: SeedClaim[];
  resumeStatus?: "running" | "paused" | null;
  lastEvent?: SeedLastEvent;
  /** RTDB presence; mặc định cả 3 online. */
  presence?: Record<string, boolean>;
  note: string;
};

/** Một scenario T-006: H (host) + B + C trong phòng, presence online cả 3, `draw_interval_sec = 3`. */
async function room(scenario: string, o: Options): Promise<void> {
  const now = Date.now();
  const expiresAt = new Date(now + (o.expiresIn ?? 8 * HOUR));
  const createdAt = new Date(expiresAt.getTime() - 8 * HOUR);
  await person(H, o.roomId);
  await person(B, o.roomId);
  await person(C, o.roomId);
  const players = o.players ?? holders();
  const started = o.gameStatus && o.gameStatus !== "waiting";
  await seedRoom({
    roomId: o.roomId,
    hostUid: H.uid,
    members: [H.uid, B.uid, C.uid],
    name: o.name,
    joinCode: o.joinCode,
    inviteCode: o.inviteCode,
    rngSeed: o.rngSeed ?? 61,
    createdAt,
    expiresAt,
    drawIntervalSec: 3,
    gameStatus: o.gameStatus ?? "waiting",
    roomStatus: o.roomStatus,
    players,
    playerCount: started ? players.length : 0,
    calledNumbers: o.calledNumbers,
    nextCallAt: o.nextCall ? new Date(now + 3000) : null,
    startedAt: started ? new Date(now - 30_000) : null,
    pauseReason: o.pauseReason ?? null,
    claims: o.claims,
    resumeStatus: o.resumeStatus ?? null,
    lastEvent: o.lastEvent,
    presence: o.presence ?? { [H.uid]: true, [B.uid]: true, [C.uid]: true },
  });
  console.log(`[${scenario}] roomId=${o.roomId} (${o.note})`);
  for (const [role, p] of [["H (host)", H], ["B", B], ["C", C]] as const) {
    console.log(`  ${role}: uid=${p.uid} email=${p.email}`);
  }
}

const five = [11, 24, 37, 52, 68];
const claimOf = (result: "win" | "miss", row: number | null): SeedClaim => ({
  uid: C.uid,
  displayName: C.name,
  ticketId: "blue_a",
  color: "blue",
  result,
  row,
});

/** T-006 `game-waiting` (alias `t006`): ván 1 `waiting`; B `red_a`, C `blue_a`+`blue_b`, H không vé. */
export const gameWaiting = () =>
  room("game-waiting", {
    roomId: "r_gm_wait",
    joinCode: "GMW234",
    inviteCode: "GAMEWAITINGINVITE0000",
    name: "Phòng chơi (chờ)",
    note: "ván 1 waiting; B red_a; C blue_a + blue_b",
  });

export const gameEmpty = () =>
  room("game-empty", {
    roomId: "r_gm_empty",
    joinCode: "GME234",
    inviteCode: "GAMEEMPTYINVITE000000",
    name: "Phòng chơi (chưa ai có vé)",
    players: [],
    note: "ván 1 waiting; không ai có vé",
  });

export const gameRunning = () =>
  room("game-running", {
    roomId: "r_gm_run",
    joinCode: "GMR234",
    inviteCode: "GAMERUNNINGINVITE0000",
    name: "Phòng chơi (đang quay)",
    gameStatus: "running",
    calledNumbers: five,
    nextCall: true,
    note: "running; đã rao 5 số; next_call_at = +3s",
  });

/** Chọn bộ vé (rngSeed) mà hàng 0 của blue_a đủ 5 số nhưng red_a chưa đủ hàng nào. */
function rowReadySetup(): { rngSeed: number; called: number[] } {
  for (let rngSeed = 62; rngSeed < 5000; rngSeed++) {
    const tickets = generateTicketSet(seededRng(rngSeed));
    const blue = tickets.find((t) => t.id === "blue_a");
    const red = tickets.find((t) => t.id === "red_a");
    if (!blue || !red) continue;
    const called = blue.grid.slice(0, 9).filter((n) => n !== 0);
    if (!checkClaim(red.grid, called).win && checkClaim(blue.grid, called).row === 0) return { rngSeed, called };
  }
  throw new Error("Không tìm được bộ vé cho game-row-ready");
}

export const gameRowReady = () => {
  const { rngSeed, called } = rowReadySetup();
  return room("game-row-ready", {
    roomId: "r_gm_row",
    joinCode: "GMO234",
    inviteCode: "GAMEROWREADYINVITE000",
    name: "Phòng chơi (sắp KINH)",
    rngSeed,
    gameStatus: "running",
    calledNumbers: called,
    nextCall: true,
    note: "running; hàng 0 của blue_a (C) đủ 5 số; red_a (B) chưa đủ hàng",
  });
};

export const gamePaused = () =>
  room("game-paused", {
    roomId: "r_gm_pause",
    joinCode: "GMP234",
    inviteCode: "GAMEPAUSEDINVITE00000",
    name: "Phòng chơi (tạm dừng)",
    gameStatus: "paused",
    pauseReason: "host",
    calledNumbers: five,
    note: "paused, pause_reason = host",
  });

export const gameAwaiting = () =>
  room("game-awaiting", {
    roomId: "r_gm_await",
    joinCode: "GMA234",
    inviteCode: "GAMEAWAITINGINVITE000",
    name: "Phòng chơi (chờ duyệt KINH)",
    gameStatus: "awaiting_confirm",
    resumeStatus: "running",
    calledNumbers: five,
    claims: [claimOf("win", 0)],
    lastEvent: { type: "claim_submitted", text: `${C.name} KINH!`, actorUid: C.uid },
    note: "awaiting_confirm; claims = [C blue_a win row 0]; resume_status = running",
  });

const almost = Array.from({ length: 89 }, (_, i) => i + 1);

export const gameNearlyDone = () =>
  room("game-nearly-done", {
    roomId: "r_gm_near",
    joinCode: "GMN234",
    inviteCode: "GAMENEARLYDONEINVITE0",
    name: "Phòng chơi (sắp hết số)",
    gameStatus: "running",
    calledNumbers: almost,
    nextCall: true,
    note: "running; đã rao 89 số",
  });

export const gameNearlyDoneClosing = () =>
  room("game-nearly-done-closing", {
    roomId: "r_gm_nearc",
    joinCode: "GMC234",
    inviteCode: "GAMENEARCLOSINGINVITE",
    name: "Phòng chơi (sắp hết số, đang đóng)",
    gameStatus: "running",
    roomStatus: "closing",
    expiresIn: -MIN,
    calledNumbers: almost,
    nextCall: true,
    note: "running; 89 số; phòng closing",
  });

export const gameNearExpiry = () =>
  room("game-near-expiry", {
    roomId: "r_gm_nexp",
    joinCode: "GMX234",
    inviteCode: "GAMENEAREXPIRYINVITE0",
    name: "Phòng chơi (sắp hết hạn)",
    expiresIn: 14 * MIN,
    note: "waiting; expires_at = +14 phút",
  });

export const gameExpiringWaiting = () =>
  room("game-expiring-waiting", {
    roomId: "r_gm_expw",
    joinCode: "GMW567",
    inviteCode: "GAMEEXPIRINGWAITINVIT",
    name: "Phòng chơi (hết hạn, chờ)",
    expiresIn: MIN,
    note: "waiting; expires_at = +60s",
  });

export const gameExpiringRunning = () =>
  room("game-expiring-running", {
    roomId: "r_gm_expr",
    joinCode: "GMR567",
    inviteCode: "GAMEEXPIRINGRUNINVITE",
    name: "Phòng chơi (hết hạn, đang quay)",
    gameStatus: "running",
    calledNumbers: five,
    nextCall: true,
    expiresIn: MIN,
    note: "running; expires_at = +60s",
  });

export const gameExpiredIdle = () =>
  room("game-expired-idle", {
    roomId: "r_gm_idle",
    joinCode: "GMI234",
    inviteCode: "GAMEEXPIREDIDLEINVITE",
    name: "Phòng chơi (đã quá hạn)",
    expiresIn: -HOUR,
    note: "waiting; expires_at đã qua, phòng vẫn active",
  });

export const gameAwaitingExpiring = () =>
  room("game-awaiting-expiring", {
    roomId: "r_gm_awexp",
    joinCode: "GMQ234",
    inviteCode: "GAMEAWAITEXPIRINGINVI",
    name: "Phòng chơi (chờ duyệt, hết hạn)",
    gameStatus: "awaiting_confirm",
    resumeStatus: "running",
    calledNumbers: five,
    claims: [claimOf("win", 0)],
    lastEvent: { type: "claim_submitted", text: `${C.name} KINH!`, actorUid: C.uid },
    expiresIn: MIN,
    note: "awaiting_confirm; expires_at = +60s",
  });

// ── T-007 (SCR-09 duyệt KINH & kết quả) ──
const missB: SeedClaim = { uid: B.uid, displayName: B.name, ticketId: "red_a", color: "red", result: "miss", row: null };
const kinhOf = (name: string) => ({ type: "claim_submitted", text: `${name} KINH!`, actorUid: C.uid }) as SeedLastEvent;

/** T-007: chờ duyệt, B hụt + C đúng → host thấy "Xác nhận kết thúc ván". */
export const resultAwaitingWin = () =>
  room("result-awaiting-win", {
    roomId: "r_rs_win",
    joinCode: "RSW234",
    inviteCode: "RESULTWININVITE000000",
    name: "Kết quả (có vé đúng)",
    gameStatus: "awaiting_confirm",
    resumeStatus: "running",
    calledNumbers: five,
    claims: [missB, claimOf("win", 0)],
    lastEvent: kinhOf(C.name),
    note: "awaiting_confirm; claims = [B red_a miss, C blue_a win row 0]",
  });

/** T-007: chờ duyệt, chỉ B hụt → host thấy "Bác bỏ – quay tiếp"; C còn KINH được. */
export const resultAwaitingMiss = () =>
  room("result-awaiting-miss", {
    roomId: "r_rs_miss",
    joinCode: "RSM234",
    inviteCode: "RESULTMISSINVITE00000",
    name: "Kết quả (toàn hụt)",
    gameStatus: "awaiting_confirm",
    resumeStatus: "running",
    calledNumbers: five,
    claims: [missB],
    lastEvent: kinhOf(B.name),
    note: "awaiting_confirm; claims = [B red_a miss]; resume_status = running",
  });

/** T-007: chờ duyệt (C đúng), host H offline → B/C thấy dòng host offline. */
export const resultHostOffline = () =>
  room("result-host-offline", {
    roomId: "r_rs_off",
    joinCode: "RSO234",
    inviteCode: "RESULTOFFLINEINVITE00",
    name: "Kết quả (host offline)",
    gameStatus: "awaiting_confirm",
    resumeStatus: "running",
    calledNumbers: five,
    claims: [claimOf("win", 0)],
    lastEvent: kinhOf(C.name),
    presence: { [H.uid]: false, [B.uid]: true, [C.uid]: true },
    note: "awaiting_confirm; C win; presence H offline",
  });
