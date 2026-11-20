/** api-contract › Me — hồ sơ của chính mình (không gồm chat_recent_at, last_active_at). */
export type Me = {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  googleName: string;
  googlePhotoUrl: string | null;
  profileCustomized: boolean;
  currentRoomId: string | null;
};

/** api-contract › SessionResult. */
export type SessionResult = {
  me: Me;
  isNewUser: boolean;
};
