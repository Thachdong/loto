"use server";

import { defineAction } from "@/core/server/action";
import { deleteCurrentSession } from "@/features/auth/server/services/session.service";
import { DeleteCurrentSessionInput } from "@/features/auth/shared/schemas/delete-current-session";

/** api-contract › deleteCurrentSession (`DELETE /sessions/current`). Thành công trả `null` (204). */
export const deleteCurrentSessionAction = defineAction({
  name: "deleteCurrentSession",
  input: DeleteCurrentSessionInput,
  auth: "required",
  handler: ({ uid }) => deleteCurrentSession(uid),
});
