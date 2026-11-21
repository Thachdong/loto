import { z } from "zod";
import { TICKET_ID_PATTERN } from "@/features/ticket/shared/constants";

/** api-contract › takeTicket: path `roomId`, `ticketId`. */
export const TakeTicketInput = z.strictObject({
  roomId: z.string().min(1).max(128),
  ticketId: z.string().max(32).regex(TICKET_ID_PATTERN),
});

export type TakeTicketInput = z.infer<typeof TakeTicketInput>;
