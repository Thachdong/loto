"use server";

import { defineAction } from "@/core/server/action";
import { resumeGame } from "@/features/game/server/services/game-lifecycle.service";
import { ResumeGameInput } from "@/features/game/shared/schemas/resume-game";

/** api-contract › resumeGame. */
export const resumeGameAction = defineAction({
  name: "resumeGame",
  input: ResumeGameInput,
  auth: "required",
  handler: ({ input, uid }) => resumeGame(uid, input),
});
