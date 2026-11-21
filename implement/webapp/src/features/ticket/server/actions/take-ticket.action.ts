"use server";

import { AppError, defineAction } from "@/core/server/action";
import { TakeTicketInput } from "@/features/ticket/shared/schemas/take-ticket";
import type { MyTickets } from "@/features/ticket/shared/types";

/** api-contract › takeTicket. Stub của bước contract (S1) — S3 thay bằng service. */
export const takeTicketAction = defineAction({
  name: "takeTicket",
  input: TakeTicketInput,
  auth: "required",
  handler: async (): Promise<MyTickets> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
