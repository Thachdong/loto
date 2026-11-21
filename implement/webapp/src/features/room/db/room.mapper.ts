import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { expireAtFrom } from "@/core/db/ttl";
import type { CloseReason, GameStatus, RoomCreated, RoomStatus, Ticket } from "@/features/room/shared/types";
import type { GameDoc } from "./game.doc";
import type { RoomDoc } from "./room.doc";
import type { TicketDoc } from "./ticket.doc";

/** Model phòng nội bộ cho service (camelCase). */
export type RoomRecord = {
  id: string;
  name: string;
  hostUid: string;
  status: RoomStatus;
  memberCount: number;
  inviteCode: string;
  joinCode: string;
  drawIntervalSec: number;
  currentGameId: string;
  gameCount: number;
  expiresAt: Date;
  createdAt: Date;
  closeReason: CloseReason | null;
};

/** Model ván nội bộ cho service. */
export type GameRecord = {
  id: string;
  seqNo: number;
  status: GameStatus;
};

/** Dữ liệu service quyết định khi tạo phòng (FLOW-02 bước 3–5). */
export type NewRoom = {
  id: string;
  name: string;
  hostUid: string;
  inviteCode: string;
  joinCode: string;
  drawIntervalSec: number;
  gameId: string;
  createdAt: Date;
  expiresAt: Date;
  tickets: Ticket[];
};

export type NewRoomDocs = {
  room: RoomDoc;
  game: GameDoc;
  tickets: { id: Ticket["id"]; doc: TicketDoc }[];
};

export function roomFromDoc(id: string, doc: RoomDoc): RoomRecord {
  return {
    id,
    name: doc.name,
    hostUid: doc.host_uid,
    status: doc.status,
    memberCount: doc.member_count,
    inviteCode: doc.invite_code,
    joinCode: doc.join_code,
    drawIntervalSec: doc.draw_interval_sec,
    currentGameId: doc.current_game_id,
    gameCount: doc.game_count,
    expiresAt: doc.expires_at.toDate(),
    createdAt: doc.created_at.toDate(),
    closeReason: doc.close_reason ?? null,
  };
}

export function gameFromDoc(id: string, doc: GameDoc): GameRecord {
  return { id, seqNo: doc.seq_no, status: doc.status };
}

/**
 * Doc phòng mới + ván 1 `waiting` + 16 vé bộ số 1 (api-contract › createRoom). Mọi doc có
 * `expire_at = created_at + 31 ngày` (NFR-11).
 */
export function newRoomDocs(room: NewRoom): NewRoomDocs {
  const at = Timestamp.fromDate(room.createdAt);
  const expiresAt = Timestamp.fromDate(room.expiresAt);
  const expireAt = Timestamp.fromDate(expireAtFrom(room.createdAt));

  return {
    room: {
      name: room.name,
      host_uid: room.hostUid,
      status: "active",
      member_count: 1,
      blocked_uids: [],
      invite_code: room.inviteCode,
      join_code: room.joinCode,
      invite_expires_at: expiresAt,
      expires_at: expiresAt,
      draw_interval_sec: room.drawIntervalSec,
      called_numbers: [],
      current_game_id: room.gameId,
      game_count: 1,
      ticket_set_no: 1,
      last_event: null,
      created_by: room.hostUid,
      created_at: at,
      updated_at: at,
      closed_at: null,
      close_reason: null,
      expire_at: expireAt,
    },
    game: {
      seq_no: 1,
      status: "waiting",
      pause_reason: null,
      next_call_at: null,
      claims: [],
      resume_status: null,
      winners: [],
      result: null,
      player_count: 0,
      started_at: null,
      ended_at: null,
      confirmed_by: null,
      created_at: at,
      expire_at: expireAt,
    },
    tickets: room.tickets.map((ticket) => ({
      id: ticket.id,
      doc: {
        color: ticket.color,
        side: ticket.side,
        grid: ticket.grid,
        set_no: 1,
        updated_at: at,
        expire_at: expireAt,
      },
    })),
  };
}

/** api-contract › RoomCreated. */
export function toRoomCreated(room: NewRoom, inviteUrl: string): RoomCreated {
  return {
    roomId: room.id,
    name: room.name,
    inviteCode: room.inviteCode,
    roomCode: room.joinCode,
    inviteUrl,
    currentGameId: room.gameId,
    drawIntervalSec: room.drawIntervalSec,
    expiresAt: room.expiresAt.toISOString(),
  };
}
