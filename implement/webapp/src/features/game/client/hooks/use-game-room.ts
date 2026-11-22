"use client";

import "client-only";

import { useMemo } from "react";
import type { DocumentData } from "firebase/firestore";
import { useCollectionListener } from "@/core/client/hooks/use-collection-listener";
import { useCurrentRoom, type CurrentRoomState } from "@/features/room/client";
import type { LeaveReasonRecord, TicketColor, TicketId, TicketSide } from "@/features/room/shared/types";
import { TICKET_ID_PATTERN, ticketColorOf } from "@/features/ticket/shared/constants";
import type { PlayerView, TicketView } from "@/features/ticket/shared/types";

/** rooms/{r}/games/{g}/players/{uid} (TBL-06) → PlayerView. */
export function mapPlayerDoc(data: DocumentData, id: string): PlayerView {
  const ids = Array.isArray(data.ticket_ids) ? (data.ticket_ids as unknown[]) : [];
  return {
    uid: id,
    displayName: typeof data.display_name === "string" ? data.display_name : "",
    photoUrl: typeof data.photo_url === "string" && data.photo_url ? data.photo_url : null,
    ticketIds: ids.filter((v): v is TicketId => typeof v === "string" && TICKET_ID_PATTERN.test(v)),
  };
}

/** rooms/{r}/tickets/{id} (TBL-03) → TicketView. */
export function mapTicketDoc(data: DocumentData, id: string): TicketView {
  const ticketId = id as TicketId;
  return {
    id: ticketId,
    color: (typeof data.color === "string" ? data.color : ticketColorOf(ticketId)) as TicketColor,
    side: (data.side === "b" || id.endsWith("_b") ? "b" : "a") as TicketSide,
    grid: Array.isArray(data.grid) ? (data.grid as number[]) : [],
    setNo: typeof data.set_no === "number" ? data.set_no : 0,
  };
}

export type GameRoomState = CurrentRoomState & {
  /** Player của ván hiện tại (đã có `ticketIds`); rỗng khi chưa tải. */
  players: PlayerView[];
  playersReady: boolean;
  /** Doc player của mình trong ván hiện tại; null = người xem / chưa vào ván. */
  me: PlayerView | null;
  /** Vé tham gia ván của mình (theo thứ tự `ticketIds`), kèm grid; vé chưa tải xong bị bỏ qua. */
  myTickets: TicketView[];
  ticketsReady: boolean;
};

type Options = {
  uid: string;
  initialRoomId: string | null;
  fallbackRoomId?: string | null;
  onLeave?: (record: LeaveReasonRecord) => void;
};

/**
 * SCR-04.A0 (CHỈ ĐỌC): ghép `useCurrentRoom` (users → rooms → games) với `games/{current}/players`
 * và `rooms/{r}/tickets`. `current_game_id` đổi → path players đổi → listener tự chuyển sang ván mới.
 */
export function useGameRoom({ uid, initialRoomId, fallbackRoomId, onLeave }: Options): GameRoomState {
  const state = useCurrentRoom({ uid, initialRoomId, fallbackRoomId, onLeave });
  const { roomId, room } = state;
  const gameId = room?.currentGameId || null;
  const inRoom = Boolean(roomId && room);

  const playersState = useCollectionListener(inRoom && gameId ? `rooms/${roomId}/games/${gameId}/players` : null, mapPlayerDoc);
  const ticketsState = useCollectionListener(inRoom ? `rooms/${roomId}/tickets` : null, mapTicketDoc);

  const me = useMemo(() => playersState.data.find((p) => p.uid === uid) ?? null, [playersState.data, uid]);
  const myTickets = useMemo(() => {
    if (!me) return [];
    const byId = new Map(ticketsState.data.map((tk) => [tk.id, tk]));
    return me.ticketIds.map((id) => byId.get(id)).filter((tk): tk is TicketView => Boolean(tk));
  }, [me, ticketsState.data]);

  return {
    ...state,
    players: playersState.data,
    playersReady: playersState.status === "ready",
    me,
    myTickets,
    ticketsReady: ticketsState.status === "ready",
  };
}
