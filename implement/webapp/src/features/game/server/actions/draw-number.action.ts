"use server";

import { defineAction } from "@/core/server/action";
import { drawNumber } from "@/features/game/server/services/draw.service";
import { DrawNumberInput } from "@/features/game/shared/schemas/draw-number";

/** api-contract › drawNumber. */
export const drawNumberAction = defineAction({
  name: "drawNumber",
  input: DrawNumberInput,
  auth: "required",
  handler: ({ input, uid }) => drawNumber(uid, input),
});
