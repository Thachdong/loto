"use server";

import { defineAction } from "@/core/server/action";
import { kickPlayer } from "@/features/room/server/services/room-kick.service";
import { KickPlayerInput } from "@/features/room/shared/schemas/kick-player";

/** api-contract › kickPlayer. */
export const kickPlayerAction = defineAction({
  name: "kickPlayer",
  input: KickPlayerInput,
  auth: "required",
  handler: ({ input, uid }) => kickPlayer(uid, input),
});
