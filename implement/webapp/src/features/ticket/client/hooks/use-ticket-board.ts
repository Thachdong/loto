"use client";

import "client-only";

import { useMemo } from "react";
import type { DocumentData } from "firebase/firestore";
import { useCollectionListener } from "@/core/client/hooks/use-collection-listener";
import { useRoomPresence } from "@/core/client/hooks/use-presence";
import type { GameStatus, TicketColor, TicketId, TicketSide } from "@/features/room/shared/types";
import { TICKET_ID_PATTERN, ticketColorOf } from "@/features/ticket/shared/constants";
import { deriveTicketCards } from "@/features/ticket/shared/domain/derive-ticket-cards";
import type { PlayerView, TicketBoard, TicketView } from "@/features/ticket/shared/types";

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

export type TicketBoardState = {
  status: "loading" | "ready" | "error";
  board: TicketBoard;
  players: PlayerView[];
  /** `null` khi chưa đọc được presence (UI không suy "Khóa tới hết ván"). */
  presence: Record<string, boolean> | null;
  /** Gắn lại listener (nút "Thử lại"). */
  retry: () => void;
};

/**
 * SCR-05.A0: nghe `rooms/{r}/tickets`, `rooms/{r}/games/{g}/players` và `presence/{r}` → `deriveTicketCards`.
 * `gameStatus = null` (ván chưa đọc được) → `loading`.
 */
export function useTicketBoard(
  roomId: string | null,
  gameId: string | null,
  gameStatus: GameStatus | null,
  meUid: string,
): TicketBoardState {
  const tickets = useCollectionListener(roomId ? `rooms/${roomId}/tickets` : null, mapTicketDoc);
  const players = useCollectionListener(roomId && gameId ? `rooms/${roomId}/games/${gameId}/players` : null, mapPlayerDoc);
  const presenceState = useRoomPresence(roomId);
  const presence = presenceState.status === "ready" ? presenceState.map : null;

  const board = useMemo(
    () => deriveTicketCards({ tickets: tickets.data, players: players.data, presence, gameStatus, meUid }),
    [tickets.data, players.data, presence, gameStatus, meUid],
  );

  const failed = tickets.status === "error" || players.status === "error";
  const ready = tickets.status === "ready" && players.status === "ready" && gameStatus !== null;
  const status = failed ? "error" : ready ? "ready" : "loading";

  const retryTickets = tickets.retry;
  const retryPlayers = players.retry;
  const retry = useMemo(
    () => () => {
      retryTickets();
      retryPlayers();
    },
    [retryTickets, retryPlayers],
  );

  return { status, board, players: players.data, presence, retry };
}
