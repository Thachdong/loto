import type { GameStatus, TicketColor, TicketId } from "@/features/room/shared/types";

/** Node RTDB `presence/{roomId}/{uid}` (TBL-08) đã map. */
export type PresenceEntry = { uid: string; online: boolean; displayName: string; photoUrl: string | null; at: number | null };

export type MemberRow = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  /** Chữ cái đầu tên — khi không có ảnh. */
  initial: string;
  online: boolean;
  /** Số phút offline (từ `presence.at`); `null` khi online hoặc không biết. */
  offlineMinutes: number | null;
  isHost: boolean;
  isMe: boolean;
  tickets: { id: TicketId; color: TicketColor; side: "a" | "b" }[];
  /** Nút "Kick" (SCR-07 #5, Q-048): người xem là host, hàng có vé, không phải host. */
  canKick: boolean;
  /** Nút "Thu hồi vé" (SCR-07 #6, BR-13): người xem là host, hàng offline + có vé + ván `waiting`. */
  canReclaim: boolean;
};

export type BuildContext = {
  hostUid: string;
  myUid: string;
  gameStatus: GameStatus;
  /** `players/{uid}.ticket_ids` của ván hiện tại. */
  ticketsByUid: Readonly<Record<string, readonly TicketId[]>>;
  nowMs: number;
};

const rank = (row: Pick<MemberRow, "isHost" | "isMe" | "online">) => (row.isHost ? 0 : row.isMe ? 1 : row.online ? 2 : 3);

/** Q-050: host → mình → online → offline; cùng nhóm theo tên (tiếng Việt). */
export function sortMembers<T extends Pick<MemberRow, "isHost" | "isMe" | "online" | "displayName">>(rows: readonly T[]): T[] {
  return [...rows].sort((a, b) => rank(a) - rank(b) || a.displayName.localeCompare(b.displayName, "vi"));
}

/** Nguồn danh sách = node presence (task T-009 `[ASSUMED]`); chip vé ghép từ doc player ván hiện tại. */
export function buildMemberRows(presence: readonly PresenceEntry[], ctx: BuildContext): MemberRow[] {
  const viewerIsHost = ctx.myUid === ctx.hostUid;
  const rows = presence.map((p): MemberRow => {
    const ids = ctx.ticketsByUid[p.uid] ?? [];
    const isHost = p.uid === ctx.hostUid;
    const hasTickets = ids.length > 0;
    return {
      uid: p.uid,
      displayName: p.displayName,
      photoUrl: p.photoUrl,
      initial: p.displayName.trim().charAt(0).toUpperCase() || "?",
      online: p.online,
      offlineMinutes: p.online || p.at === null ? null : Math.max(0, Math.floor((ctx.nowMs - p.at) / 60_000)),
      isHost,
      isMe: p.uid === ctx.myUid,
      tickets: ids.map((id) => {
        const [color, side] = id.split("_") as [TicketColor, "a" | "b"];
        return { id, color, side };
      }),
      canKick: viewerIsHost && !isHost && hasTickets,
      canReclaim: viewerIsHost && !isHost && hasTickets && !p.online && ctx.gameStatus === "waiting",
    };
  });
  return sortMembers(rows);
}
