import "server-only";

import type { Timestamp } from "firebase-admin/firestore";

/** database.md › TBL-06 `rooms/{roomId}/games/{gameId}/players/{uid}` — đúng tên field snake_case. */
export type PlayerDoc = {
  display_name: string;
  photo_url: string | null;
  /** 0–2 phần tử (BR-09); mỗi vé thuộc tối đa 1 player của ván. */
  ticket_ids: string[];
  /** Lúc lấy vé đầu tiên. */
  joined_at: Timestamp;
  /** TTL (NFR-11) = rooms.created_at + 31 ngày. */
  expire_at: Timestamp;
};

/** RTDB TBL-08 `presence/{roomId}/{uid}`. */
export type PresenceNode = {
  online?: boolean;
  display_name?: string;
  photo_url?: string | null;
  at?: number;
};
