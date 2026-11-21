import { TICKET_COLORS } from "@/features/room/shared/constants";
import type { TicketColor, TicketId } from "@/features/room/shared/types";

/** BR-09: mỗi người giữ tối đa 2 vé. */
export const MAX_TICKETS_PER_PLAYER = 2;

/** api-contract › TicketId: `{color}_{side}`. */
export const TICKET_ID_PATTERN = /^(red|orange|yellow|green|teal|blue|purple|pink)_(a|b)$/;

/** 16 id theo thứ tự hiển thị cố định: màu theo `TICKET_COLORS`, A rồi B (SCR-05 #3). */
export const TICKET_IDS: readonly TicketId[] = TICKET_COLORS.flatMap((color) => [`${color}_a`, `${color}_b`] as const);

export const TICKET_COUNT = TICKET_IDS.length;

export function ticketColorOf(id: TicketId): TicketColor {
  return id.slice(0, id.lastIndexOf("_")) as TicketColor;
}
