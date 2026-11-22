"use server";

import { AppError, defineAction } from "@/core/server/action";
import { StartGameInput } from "@/features/game/shared/schemas/start-game";
import type { GameState } from "@/features/game/shared/types";

/** api-contract › startGame. Stub của bước contract (S1) — bước backend thay bằng service. */
export const startGameAction = defineAction({
  name: "startGame",
  input: StartGameInput,
  auth: "required",
  handler: async (): Promise<GameState> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
