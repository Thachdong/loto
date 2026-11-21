"use server";

import { AppError, defineAction } from "@/core/server/action";
import { JoinRoomInput } from "@/features/invite/shared/schemas/join-room";
import type { JoinRoomResult } from "@/features/invite/shared/types";

/** api-contract › joinRoom (`POST /rooms/join`). */
export const joinRoomAction = defineAction({
  name: "joinRoom",
  input: JoinRoomInput,
  auth: "required",
  // TODO(S3): implement — gọi joinRoom(uid, input) trong join-room.service.
  handler: async (): Promise<JoinRoomResult> => {
    throw new AppError("INTERNAL_ERROR");
  },
});
