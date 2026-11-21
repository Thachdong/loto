import "server-only";

import { cache } from "react";
import { connection } from "next/server";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { getCurrentRoomId, getPublicProfile } from "@/features/auth/db/user.repository";
import { findRoomByInviteCode } from "@/features/room/db/room.repository";
import type { RoomRecord } from "@/features/room/db/room.mapper";
import { computeInviteStatus } from "@/features/invite/shared/domain/invite-status";
import type { InvitePreview, InviteViewer } from "@/features/invite/shared/types";
import { INVITE_CODE_PATTERN, MAX_MEMBERS } from "@/features/room/shared/constants";

type InviteRoomData = { room: RoomRecord; hostName: string; hostPhotoUrl: string | null };

/** Phòng + host theo `code`, dùng chung cho `page` và `generateMetadata` (1 lần truy vấn / request). */
const loadInviteRoom = cache(async (code: string): Promise<InviteRoomData | null> => {
  const room = await findRoomByInviteCode(code);
  if (!room) return null;
  const host = await getPublicProfile(room.hostUid);
  return { room, hostName: host?.displayName ?? "", hostPhotoUrl: host?.photoUrl ?? null };
});

async function viewerOf(uid: string, room: RoomRecord): Promise<InviteViewer> {
  const currentRoomId = await getCurrentRoomId(uid);
  return { inThisRoom: currentRoomId === room.id, currentRoomId, blocked: room.blockedUids.includes(uid) };
}

/**
 * api-contract › getInvite (`x-transport: ssr`): hàm đọc thuần cho `page.tsx` và `generateMetadata`,
 * không ghi DB. Mã sai định dạng (không truy vấn DB) / không tồn tại → `AppError('INVITE_INVALID')`.
 * Chỉ trả field của `InvitePreview` — không `host_uid`, email, `invite_code`, `blocked_uids` (NFR-10).
 */
export async function getInvite(code: string, viewerUid?: string | null): Promise<InvitePreview> {
  if (!INVITE_CODE_PATTERN.test(code)) throw new AppError("INVITE_INVALID");

  const data = await loadInviteRoom(code);
  if (!data) throw new AppError("INVITE_INVALID");
  const { room, hostName, hostPhotoUrl } = data;

  // `now()` là dữ liệu theo request (cacheComponents).
  await connection();
  const status = computeInviteStatus(room, now());

  return {
    status,
    room: {
      name: room.name,
      hostName,
      hostPhotoUrl,
      memberCount: room.memberCount,
      maxMembers: MAX_MEMBERS as 16,
      expiresAt: room.inviteExpiresAt.toISOString(),
    },
    viewer: viewerUid ? await viewerOf(viewerUid, room) : null,
  };
}
