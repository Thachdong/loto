import "server-only";

import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { firestore } from "@/core/db/firestore";

/** TBL-04 `rooms/{roomId}/messages/{id}`. */
export type MessageDoc = {
  sender_uid: string;
  sender_name: string;
  sender_photo_url: string | null;
  text: string;
  created_at: Timestamp;
  expire_at: Timestamp;
};

export type NewMessage = { senderUid: string; senderName: string; senderPhotoUrl: string | null; text: string; now: Date; expireAt: Date };

/** Tạo doc tin (auto-id) trong transaction; trả id. `created_at` = giờ server của transaction. */
export function createMessageInTx(tx: Transaction, roomId: string, message: NewMessage): string {
  const ref = firestore().collection("rooms").doc(roomId).collection("messages").doc();
  const doc: MessageDoc = {
    sender_uid: message.senderUid,
    sender_name: message.senderName,
    sender_photo_url: message.senderPhotoUrl,
    text: message.text,
    created_at: Timestamp.fromDate(message.now),
    expire_at: Timestamp.fromDate(message.expireAt),
  };
  tx.create(ref, doc);
  return ref.id;
}
