"use server";

import { defineAction } from "@/core/server/action";
import { createClaim } from "@/features/game/server/services/claim.service";
import { CreateClaimInput } from "@/features/game/shared/schemas/create-claim";

/** api-contract › createClaim. */
export const createClaimAction = defineAction({
  name: "createClaim",
  input: CreateClaimInput,
  auth: "required",
  handler: ({ input, uid }) => createClaim(uid, input),
});
