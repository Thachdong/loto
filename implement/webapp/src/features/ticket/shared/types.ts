import type { TicketColor, TicketId, TicketSide } from "@/features/room/shared/types";

/** api-contract › MyTickets. */
export type MyTickets = { gameId: string; ticketIds: TicketId[] };
/** api-contract › TicketSetRenewed. */
export type TicketSetRenewed = { ticketSetNo: number };
/** api-contract › ReclaimResult. */
export type ReclaimResult = { uid: string; releasedTicketIds: TicketId[] };

/** `error.details[]` của `TICKETS_STILL_HELD` (FLOW-04 E2). */
export type StillHeldDetail = {
  code: "holder";
  uid: string;
  displayName: string;
  ticketIds: TicketId[];
  online: boolean;
};

/** Vé như client đọc từ listener `rooms/{r}/tickets` (TBL-03). */
export type TicketView = { id: TicketId; color: TicketColor; side: TicketSide; grid: number[]; setNo: number };

/** Player như client đọc từ listener `games/{g}/players` (TBL-06). */
export type PlayerView = { uid: string; displayName: string; photoUrl: string | null; ticketIds: TicketId[] };

export type TicketHolder = { uid: string; displayName: string; photoUrl: string | null };

/** Biến thể nút hành động trong xem trước vé (SCR-05 #5/#6). */
export type TicketAction = "take" | "release" | "max" | "taken" | "running";

/** Thẻ vé đã dẫn xuất cho UI (SCR-05 #3). */
export type TicketCardVM = {
  id: TicketId;
  color: TicketColor;
  side: TicketSide;
  /** null khi doc vé chưa đọc được. */
  ticket: TicketView | null;
  holder: TicketHolder | null;
  mine: boolean;
  /** Ván không `waiting` và người giữ không còn node trong `presence/{roomId}` (BR-22, Q-050). */
  lockedUntilEnd: boolean;
  action: TicketAction;
  partnerId: TicketId;
};

export type TicketBoard = {
  /** Luôn đúng 16 phần tử theo `TICKET_IDS`. */
  cards: TicketCardVM[];
  myCount: number;
  heldCount: number;
  soldOut: boolean;
  /** `gameStatus !== "waiting"`. */
  locked: boolean;
};
