"use server";

import { defineAction } from "@/core/server/action";
import { releaseTicket } from "@/features/ticket/server/services/ticket.service";
import { ReleaseTicketInput } from "@/features/ticket/shared/schemas/release-ticket";

/** api-contract › releaseTicket. */
export const releaseTicketAction = defineAction({
  name: "releaseTicket",
  input: ReleaseTicketInput,
  auth: "required",
  handler: ({ input, uid }) => releaseTicket(uid, input),
});
