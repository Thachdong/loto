"use server";

import { defineAction } from "@/core/server/action";
import { startGame } from "@/features/game/server/services/game-lifecycle.service";
import { StartGameInput } from "@/features/game/shared/schemas/start-game";

/** api-contract › startGame. */
export const startGameAction = defineAction({
  name: "startGame",
  input: StartGameInput,
  auth: "required",
  handler: ({ input, uid }) => startGame(uid, input),
});
