"use server";

import { defineAction } from "@/core/server/action";
import { renewTicketSet } from "@/features/ticket/server/services/ticket.service";
import { RenewTicketSetInput } from "@/features/ticket/shared/schemas/renew-ticket-set";

/** api-contract › renewTicketSet. */
export const renewTicketSetAction = defineAction({
  name: "renewTicketSet",
  input: RenewTicketSetInput,
  auth: "required",
  handler: ({ input, uid }) => renewTicketSet(uid, input),
});
