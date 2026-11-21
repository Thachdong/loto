import "server-only";

import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { logError } from "@/core/server/log";
import { cryptoRandomInt, cryptoRng } from "@/core/server/random";
import { getUserInTx, setCurrentRoomInTx } from "@/features/auth/db/user.repository";
import { toRoomCreated, type NewRoom } from "@/features/room/db/room.mapper";
import {
  createRoomInTx,
  findOpenRoomByJoinCodeInTx,
  newRoomIds,
  runTransaction,
  setPresenceAccess,
} from "@/features/room/db/room.repository";
import {
  DEFAULT_DRAW_INTERVAL_SEC,
  INVITE_CODE_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
} from "@/features/room/shared/constants";
import { generateTicketSet } from "@/features/room/shared/domain/generate-ticket-set";
import { BASE62, randomCode } from "@/features/room/shared/domain/random-code";
import { resolveRoomName } from "@/features/room/shared/domain/room-name";
import type { CreateRoomInput } from "@/features/room/shared/schemas/create-room";
import type { RoomCreated } from "@/features/room/shared/types";
import { planLazyExpiry, type LazyExpiryPlan } from "./room-expiry.service";

/** BR-30: trùng `join_code` với phòng đang mở thì sinh lại, tối đa 5 lần. */
export const MAX_JOIN_CODE_ATTEMPTS = 5;

export type CreateRoomOptions = {
  /** Chỉ dùng trong test (AC-22): thay bộ sinh `join_code`. Mặc định `crypto.randomInt`. */
  generateJoinCode?: () => string;
};

function generateJoinCode(): string {
  return randomCode(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, cryptoRandomInt);
}

/** `${NEXT_PUBLIC_APP_URL}/join/${inviteCode}` (SUP-06). */
function inviteUrlOf(inviteCode: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/join/${inviteCode}`;
}

type TxOutcome =
  | { kind: "created"; room: NewRoom; expiry: LazyExpiryPlan | null }
  | { kind: "already_in_room"; currentRoomId: string; expiry: LazyExpiryPlan };

/**
 * api-contract › createRoom (FLOW-02). Một transaction, mọi đọc trước mọi ghi:
 * đọc user → (đang ở phòng) lazy expiry pha đọc → kiểm trùng `join_code` → ghi.
 */
export async function createRoom(
  uid: string,
  input: CreateRoomInput,
  options: CreateRoomOptions = {},
): Promise<RoomCreated> {
  const createdAt = now();
  const nextJoinCode = options.generateJoinCode ?? generateJoinCode;
  // Ngoài transaction: dữ liệu ngẫu nhiên không phụ thuộc DB (NFR-08).
  const inviteCode = randomCode(BASE62, INVITE_CODE_LENGTH, cryptoRandomInt);
  const tickets = generateTicketSet(cryptoRng());
  const { roomId, gameId } = newRoomIds();

  const outcome = await runTransaction<TxOutcome>(async (tx) => {
    // ── Pha đọc ──
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");

    const name = resolveRoomName(input.name, me.displayName);
    if (name === null) throw new AppError("ROOM_NAME_INVALID");

    let expiry: LazyExpiryPlan | null = null;
    if (me.currentRoomId) {
      expiry = await planLazyExpiry(tx, { roomId: me.currentRoomId, now: createdAt });
      // Phòng còn mở (còn hạn, hoặc chờ đóng) → BR-02. Phòng closed / không tồn tại → coi như trống.
      if (expiry.status === "active" || expiry.status === "closing") {
        expiry.apply(tx); // vẫn lưu `closing` nếu vừa đến hạn
        return { kind: "already_in_room", currentRoomId: me.currentRoomId, expiry };
      }
    }

    let joinCode: string | null = null;
    for (let attempt = 0; attempt < MAX_JOIN_CODE_ATTEMPTS && !joinCode; attempt++) {
      const candidate = nextJoinCode();
      if (!(await findOpenRoomByJoinCodeInTx(tx, candidate))) joinCode = candidate;
    }
    if (!joinCode) {
      logError({ action: "createRoom", code: "INTERNAL_ERROR", message: "join_code_exhausted" });
      throw new AppError("INTERNAL_ERROR");
    }

    // ── Pha ghi ──
    const room: NewRoom = {
      id: roomId,
      name,
      hostUid: uid,
      inviteCode,
      joinCode,
      drawIntervalSec: DEFAULT_DRAW_INTERVAL_SEC,
      gameId,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + ROOM_TTL_MS),
      tickets,
    };
    expiry?.apply(tx, { exceptUids: [uid] });
    createRoomInTx(tx, room);
    setCurrentRoomInTx(tx, uid, roomId, createdAt);
    return { kind: "created", room, expiry };
  });

  await outcome.expiry?.afterCommit();

  if (outcome.kind === "already_in_room") {
    throw new AppError("ALREADY_IN_ROOM", [{ code: "current_room", currentRoomId: outcome.currentRoomId }]);
  }

  // RTDB không nằm trong transaction Firestore — lỗi chỉ log, vẫn trả thành công.
  try {
    await setPresenceAccess(roomId, uid);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logError({ action: "createRoom", code: "PRESENCE_ACCESS_FAILED", message: err.message, stack: err.stack });
  }

  return toRoomCreated(outcome.room, inviteUrlOf(inviteCode));
}
