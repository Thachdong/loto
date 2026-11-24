import { BACKUP_STEP_MS } from "@/features/game/shared/constants";

export type DrawRole = "host" | { backupIndex: number };

type Input = {
  /** `games.next_call_at` (giờ server). */
  nextCallAt: Date | number;
  role: DrawRole;
  /** `serverTime − localTime` (ms), VD RTDB `.info/serverTimeOffset`. */
  serverOffsetMs: number;
};

/**
 * Giờ máy (epoch ms) cần gọi `drawNumber` (ADR-05, Q-052): host = `next_call_at`;
 * dự phòng thứ k (k ≥ 1) = `next_call_at + 5k s`; quy đổi từ giờ server sang giờ máy bằng offset.
 */
export function drawFireAt({ nextCallAt, role, serverOffsetMs }: Input): number {
  const serverMs = nextCallAt instanceof Date ? nextCallAt.getTime() : nextCallAt;
  const delay = role === "host" ? 0 : Math.max(1, Math.floor(role.backupIndex)) * BACKUP_STEP_MS;
  return serverMs + delay - serverOffsetMs;
}
