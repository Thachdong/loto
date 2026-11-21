"use server";

import { AppError, defineAction } from "@/core/server/action";
import { ReleaseTicketInput } from "@/features/ticket/shared/schemas/release-ticket";
import type { MyTickets } from "@/features/ticket/shared/types";

/** api-contract › releaseTicket. Stub của bước contract (S1) — S3 thay bằng service. */
export const releaseTicketAction = defineAction({
  name: "releaseTicket",
  input: ReleaseTicketInput,
  auth: "required",
  handler: async (): Promise<MyTickets> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
