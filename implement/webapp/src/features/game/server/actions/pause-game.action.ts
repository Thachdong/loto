"use server";

import { AppError, defineAction } from "@/core/server/action";
import { PauseGameInput } from "@/features/game/shared/schemas/pause-game";
import type { GameState } from "@/features/game/shared/types";

/** api-contract › pauseGame. Stub của bước contract (S1) — bước backend thay bằng service. */
export const pauseGameAction = defineAction({
  name: "pauseGame",
  input: PauseGameInput,
  auth: "required",
  handler: async (): Promise<GameState> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
