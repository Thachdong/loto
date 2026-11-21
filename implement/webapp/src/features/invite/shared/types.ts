/** api-contract › InvitePreview › status. */
export type InviteStatus = "valid" | "expired" | "closed" | "full";

/** api-contract › InvitePreview › room — chỉ tên phòng, tên/ảnh host, số người, hạn (NFR-10). */
export type InviteRoom = {
  name: string;
  hostName: string;
  hostPhotoUrl: string | null;
  memberCount: number;
  maxMembers: 16;
  /** ISO 8601 = `invite_expires_at`. */
  expiresAt: string;
};

/** api-contract › InviteViewer — chỉ có khi có session cookie hợp lệ. */
export type InviteViewer = {
  inThisRoom: boolean;
  currentRoomId: string | null;
  blocked: boolean;
};

/** api-contract › InvitePreview. `viewer = null` khi chưa đăng nhập. */
export type InvitePreview = {
  status: InviteStatus;
  room: InviteRoom;
  viewer: InviteViewer | null;
};

/** api-contract › JoinRoomResult. */
export type JoinRoomResult = {
  roomId: string;
  alreadyMember: boolean;
};
