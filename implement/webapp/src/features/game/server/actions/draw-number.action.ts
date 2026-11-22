"use server";

import { AppError, defineAction } from "@/core/server/action";
import { DrawNumberInput } from "@/features/game/shared/schemas/draw-number";
import type { DrawResult } from "@/features/game/shared/types";

/** api-contract › drawNumber. Stub của bước contract (S1) — bước backend thay bằng service. */
export const drawNumberAction = defineAction({
  name: "drawNumber",
  input: DrawNumberInput,
  auth: "required",
  handler: async (): Promise<DrawResult> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
