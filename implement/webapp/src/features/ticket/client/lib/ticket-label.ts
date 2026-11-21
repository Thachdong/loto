import { t } from "@/core/shared/i18n/vi";
import type { TicketId } from "@/features/room/shared/types";
import { ticketColorOf } from "@/features/ticket/shared/constants";

/** "Đỏ A", "Ngọc B"… */
export function ticketLabel(id: TicketId): string {
  return `${t(`ticket.color.${ticketColorOf(id)}`)} ${t(id.endsWith("_a") ? "ticket.side.a" : "ticket.side.b")}`;
}
