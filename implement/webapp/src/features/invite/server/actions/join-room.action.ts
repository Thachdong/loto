"use server";

import { defineAction } from "@/core/server/action";
import { joinRoom } from "@/features/invite/server/services/join-room.service";
import { JoinRoomInput } from "@/features/invite/shared/schemas/join-room";
import type { JoinRoomResult } from "@/features/invite/shared/types";

/** api-contract › joinRoom (`POST /rooms/join`). */
export const joinRoomAction = defineAction({
  name: "joinRoom",
  input: JoinRoomInput,
  auth: "required",
  handler: ({ input, uid }): Promise<JoinRoomResult> => joinRoom(uid, input),
});
