"use server";

import { defineAction } from "@/core/server/action";
import { rejectClaims } from "@/features/game/server/services/result.service";
import { RejectClaimsInput } from "@/features/game/shared/schemas/reject-claims";

/** api-contract › rejectClaims. */
export const rejectClaimsAction = defineAction({
  name: "rejectClaims",
  input: RejectClaimsInput,
  auth: "required",
  handler: ({ input, uid }) => rejectClaims(uid, input),
});
