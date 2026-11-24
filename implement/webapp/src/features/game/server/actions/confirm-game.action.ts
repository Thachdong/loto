"use server";

import { defineAction } from "@/core/server/action";
import { confirmGame } from "@/features/game/server/services/result.service";
import { ConfirmGameInput } from "@/features/game/shared/schemas/confirm-game";

/** api-contract › confirmGame. */
export const confirmGameAction = defineAction({
  name: "confirmGame",
  input: ConfirmGameInput,
  auth: "required",
  handler: ({ input, uid }) => confirmGame(uid, input),
});
