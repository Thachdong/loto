"use server";

import { AppError, defineAction } from "@/core/server/action";
import { DeleteCurrentSessionInput } from "@/features/auth/shared/schemas/delete-current-session";

/** api-contract › deleteCurrentSession (`DELETE /sessions/current`). Thành công trả `null` (204). */
export const deleteCurrentSessionAction = defineAction({
  name: "deleteCurrentSession",
  input: DeleteCurrentSessionInput,
  auth: "required",
  // TODO(S4): implement — gọi deleteCurrentSession(uid) trong session.service.
  handler: async (): Promise<null> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
