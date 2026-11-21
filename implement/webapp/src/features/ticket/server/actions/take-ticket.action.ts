"use server";

import { defineAction } from "@/core/server/action";
import { takeTicket } from "@/features/ticket/server/services/ticket.service";
import { TakeTicketInput } from "@/features/ticket/shared/schemas/take-ticket";

/** api-contract › takeTicket. */
export const takeTicketAction = defineAction({
  name: "takeTicket",
  input: TakeTicketInput,
  auth: "required",
  handler: ({ input, uid }) => takeTicket(uid, input),
});
