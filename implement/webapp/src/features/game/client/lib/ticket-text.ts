import { t } from "@/core/shared/i18n/vi";
import type { TicketColor, TicketId } from "@/features/room/shared/types";

/** "red_a" → `{ color: "Đỏ", side: "A" }` — để điền `kinh.ticket` / `claim.item`. */
export function ticketParts(id: TicketId, color?: TicketColor): { color: string; side: string } {
  const c = color ?? (id.slice(0, id.lastIndexOf("_")) as TicketColor);
  return { color: t(`ticket.color.${c}`), side: t(id.endsWith("_a") ? "ticket.side.a" : "ticket.side.b") };
}
