"use server";

import { AppError, defineAction } from "@/core/server/action";
import { RenewTicketSetInput } from "@/features/ticket/shared/schemas/renew-ticket-set";
import type { TicketSetRenewed } from "@/features/ticket/shared/types";

/** api-contract › renewTicketSet. Stub của bước contract (S1) — S3 thay bằng service. */
export const renewTicketSetAction = defineAction({
  name: "renewTicketSet",
  input: RenewTicketSetInput,
  auth: "required",
  handler: async (): Promise<TicketSetRenewed> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
