/**
 * Seed dữ liệu cho Firebase Emulator: `npm run seed -- <scenario>`.
 * Task sau thêm scenario vào `scenarios/tXXX.ts` và đăng ký trong `SCENARIOS`.
 */
import { emulatorGuardError } from "./lib/env";
import { reset } from "./scenarios/reset";
import { smoke } from "./scenarios/smoke";
import { t002 } from "./scenarios/t002";
import { t003 } from "./scenarios/t003";
import { t004 } from "./scenarios/t004";
import {
  gameAwaiting,
  gameAwaitingExpiring,
  gameEmpty,
  gameExpiredIdle,
  gameExpiringRunning,
  gameExpiringWaiting,
  gameNearExpiry,
  gameNearlyDone,
  gameNearlyDoneClosing,
  gamePaused,
  gameRowReady,
  gameRunning,
  gameWaiting,
  history,
  resultAwaitingMiss,
  resultAwaitingWin,
  resultHostOffline,
} from "./scenarios/t006";
import { ticketsBasic, ticketsCarry, ticketsRunning } from "./scenarios/t005";
import { roomMembers } from "./scenarios/t009";

const SCENARIOS: Record<string, () => Promise<void>> = {
  reset,
  smoke,
  t002,
  t003,
  t004,
  "tickets-basic": ticketsBasic,
  "tickets-running": ticketsRunning,
  "tickets-carry": ticketsCarry,
  t005: ticketsBasic,
  "game-waiting": gameWaiting,
  t006: gameWaiting,
  "game-empty": gameEmpty,
  "game-running": gameRunning,
  "game-row-ready": gameRowReady,
  "game-paused": gamePaused,
  "game-awaiting": gameAwaiting,
  "game-nearly-done": gameNearlyDone,
  "game-nearly-done-closing": gameNearlyDoneClosing,
  "game-near-expiry": gameNearExpiry,
  "game-expiring-waiting": gameExpiringWaiting,
  "game-expiring-running": gameExpiringRunning,
  "game-expired-idle": gameExpiredIdle,
  "game-awaiting-expiring": gameAwaitingExpiring,
  "result-awaiting-win": resultAwaitingWin,
  "result-awaiting-miss": resultAwaitingMiss,
  "result-host-offline": resultHostOffline,
  t007: resultAwaitingWin,
  history,
  t010: history,
  "room-members": roomMembers,
  t009: roomMembers,
};

async function main(): Promise<number> {
  const guard = emulatorGuardError();
  if (guard) {
    console.error(guard);
    return 1;
  }

  const name = process.argv[2];
  const scenario = name ? SCENARIOS[name] : undefined;
  if (!scenario) {
    console.error(`Scenario không hợp lệ: "${name ?? ""}". Có: ${Object.keys(SCENARIOS).join(", ")}`);
    return 1;
  }

  await scenario();
  console.log(`Seed "${name}" xong.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
