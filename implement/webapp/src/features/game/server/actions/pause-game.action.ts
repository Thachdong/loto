"use server";

import { defineAction } from "@/core/server/action";
import { pauseGame } from "@/features/game/server/services/game-lifecycle.service";
import { PauseGameInput } from "@/features/game/shared/schemas/pause-game";

/** api-contract › pauseGame. */
export const pauseGameAction = defineAction({
  name: "pauseGame",
  input: PauseGameInput,
  auth: "required",
  handler: ({ input, uid }) => pauseGame(uid, input),
});
