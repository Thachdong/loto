import "server-only";

import { Timestamp } from "firebase-admin/firestore";
import { expireAtFrom } from "@/core/db/ttl";
import type { TicketId } from "@/features/room/shared/types";
import type { PlayerDoc } from "./player.doc";

/** Model player nội bộ cho service (camelCase). */
export type PlayerRecord = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  ticketIds: TicketId[];
};

export type NewPlayer = {
  displayName: string;
  photoUrl: string | null;
  ticketId: TicketId;
  joinedAt: Date;
  /** `rooms.created_at` — `expire_at` = +31 ngày (NFR-11). */
  roomCreatedAt: Date;
};

export function playerFromDoc(uid: string, doc: PlayerDoc): PlayerRecord {
  return {
    uid,
    displayName: doc.display_name,
    photoUrl: doc.photo_url ?? null,
    ticketIds: [...(doc.ticket_ids ?? [])] as TicketId[],
  };
}

/** Doc player mới khi lấy vé đầu tiên. */
export function newPlayerDoc(player: NewPlayer): PlayerDoc {
  return {
    display_name: player.displayName,
    photo_url: player.photoUrl,
    ticket_ids: [player.ticketId],
    joined_at: Timestamp.fromDate(player.joinedAt),
    expire_at: Timestamp.fromDate(expireAtFrom(player.roomCreatedAt)),
  };
}
