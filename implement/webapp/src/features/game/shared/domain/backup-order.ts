import { TICKET_ORDER } from "@/features/game/shared/constants";
import type { TicketId } from "@/features/room/shared/types";

export type BackupPlayer = { uid: string; ticketIds: readonly TicketId[] };

/**
 * Thứ tự người gọi `drawNumber` dự phòng (Q-052, ADR-05): bỏ host, bỏ player không vé,
 * sắp theo chỉ số vé nhỏ nhất trong `TICKET_ORDER` (Đỏ A → Hồng B). Hòa → theo uid cho ổn định.
 */
export function backupOrder(players: readonly BackupPlayer[], hostUid: string): string[] {
  const rankOf = (ids: readonly TicketId[]) => Math.min(...ids.map((id) => TICKET_ORDER.indexOf(id)).filter((i) => i >= 0));
  return players
    .filter((p) => p.uid !== hostUid)
    .map((p) => ({ uid: p.uid, rank: rankOf(p.ticketIds) }))
    .filter((p) => Number.isFinite(p.rank))
    .sort((a, b) => a.rank - b.rank || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0))
    .map((p) => p.uid);
}

/** k (bắt đầu từ 1) của `uid` trong danh sách dự phòng; không có → `null`. */
export function backupIndexOf(order: readonly string[], uid: string): number | null {
  const i = order.indexOf(uid);
  return i < 0 ? null : i + 1;
}
