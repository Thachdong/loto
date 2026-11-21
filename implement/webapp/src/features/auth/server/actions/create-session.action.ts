"use server";

import { defineAction } from "@/core/server/action";
import { createSession } from "@/features/auth/server/services/session.service";
import { CreateSessionInput } from "@/features/auth/shared/schemas/create-session";

/** api-contract › createSession (`POST /sessions`). */
export const createSessionAction = defineAction({
  name: "createSession",
  input: CreateSessionInput,
  auth: "none",
  handler: ({ input }) => createSession(input.idToken),
});
