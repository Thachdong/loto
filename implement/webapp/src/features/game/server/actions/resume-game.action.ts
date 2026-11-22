"use server";

import { AppError, defineAction } from "@/core/server/action";
import { ResumeGameInput } from "@/features/game/shared/schemas/resume-game";
import type { GameState } from "@/features/game/shared/types";

/** api-contract › resumeGame. Stub của bước contract (S1) — bước backend thay bằng service. */
export const resumeGameAction = defineAction({
  name: "resumeGame",
  input: ResumeGameInput,
  auth: "required",
  handler: async (): Promise<GameState> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
