"use server";

import { AppError, defineAction } from "@/core/server/action";
import { ReclaimPlayerTicketsInput } from "@/features/ticket/shared/schemas/reclaim-player-tickets";
import type { ReclaimResult } from "@/features/ticket/shared/types";

/** api-contract › reclaimPlayerTickets. Stub của bước contract (S1) — S3 thay bằng service. */
export const reclaimPlayerTicketsAction = defineAction({
  name: "reclaimPlayerTickets",
  input: ReclaimPlayerTicketsInput,
  auth: "required",
  handler: async (): Promise<ReclaimResult> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
