"use server";

import { defineAction } from "@/core/server/action";
import { reclaimPlayerTickets } from "@/features/ticket/server/services/ticket.service";
import { ReclaimPlayerTicketsInput } from "@/features/ticket/shared/schemas/reclaim-player-tickets";

/** api-contract › reclaimPlayerTickets. */
export const reclaimPlayerTicketsAction = defineAction({
  name: "reclaimPlayerTickets",
  input: ReclaimPlayerTicketsInput,
  auth: "required",
  handler: ({ input, uid }) => reclaimPlayerTickets(uid, input),
});
