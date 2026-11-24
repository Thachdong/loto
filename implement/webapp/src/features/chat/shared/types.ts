/** api-contract › Message (TBL-04). */
export type Message = {
  id: string;
  senderUid: string;
  senderName: string;
  senderPhotoUrl: string | null;
  text: string;
  /** ISO 8601. */
  createdAt: string;
};
