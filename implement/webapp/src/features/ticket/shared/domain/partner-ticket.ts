import type { TicketId } from "@/features/room/shared/types";
import { ticketColorOf } from "@/features/ticket/shared/constants";

/** Vé cặp: cùng màu, cạnh còn lại (hai vé cùng màu gộp đủ 1–90, BR-08). */
export function partnerOf(id: TicketId): TicketId {
  return `${ticketColorOf(id)}_${id.endsWith("_a") ? "b" : "a"}`;
}
