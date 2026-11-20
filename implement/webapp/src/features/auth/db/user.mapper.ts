import "server-only";

import type { Me } from "@/features/auth/shared/types";
import type { UserDoc } from "./user.doc";

/** api-contract › Me — chỉ field của chính chủ; không lộ `chat_recent_at`, `last_active_at`. */
export function toMe(uid: string, doc: UserDoc): Me {
  return {
    uid,
    email: doc.email,
    displayName: doc.display_name,
    photoUrl: doc.photo_url ?? null,
    googleName: doc.google_name,
    googlePhotoUrl: doc.google_photo_url ?? null,
    profileCustomized: doc.profile_customized,
    currentRoomId: doc.current_room_id ?? null,
  };
}
