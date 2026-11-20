import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

/** database.md › TBL-01 `users/{uid}` — đúng tên field snake_case lưu trong Firestore. */
export type UserDoc = {
  email: string;
  google_name: string;
  google_photo_url: string | null;
  display_name: string;
  photo_url: string | null;
  profile_customized: boolean;
  current_room_id: string | null;
  chat_recent_at: Timestamp[];
  last_active_at: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
};
