"use server";

import { AppError, defineAction } from "@/core/server/action";
import { CreateClaimInput } from "@/features/game/shared/schemas/create-claim";
import type { ClaimResult } from "@/features/game/shared/types";

/** api-contract › createClaim. Stub của bước contract (S1) — bước backend thay bằng service. */
export const createClaimAction = defineAction({
  name: "createClaim",
  input: CreateClaimInput,
  auth: "required",
  handler: async (): Promise<ClaimResult> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
