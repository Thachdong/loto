import "server-only";

import type { Timestamp } from "firebase-admin/firestore";
import type { TicketColor, TicketSide } from "@/features/room/shared/types";

/** database.md › TBL-03 `rooms/{roomId}/tickets/{color}_{side}`. */
export type TicketDoc = {
  color: TicketColor;
  side: TicketSide;
  /** 81 phần tử theo hàng, 0 = ô trống (BR-08). */
  grid: number[];
  set_no: number;
  updated_at: Timestamp;
  /** TTL (NFR-11) = rooms.created_at + 31 ngày. */
  expire_at: Timestamp;
};
