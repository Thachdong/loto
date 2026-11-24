import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { expireAtFrom } from "@/core/db/ttl";
import type { ErrorCode } from "@/core/shared/errors";
import { getChatRecentAtInTx, getUserInTx, setChatRecentAtInTx } from "@/features/auth/db/user.repository";
import { createMessageInTx } from "@/features/chat/db/message.repository";
import { checkChatRate, normalizeMessage } from "@/features/chat/shared/domain/message-rules";
import type { SendMessageInput } from "@/features/chat/shared/schemas/send-message";
import type { Message } from "@/features/chat/shared/types";
import { runTransaction } from "@/features/room/db/room.repository";
import { planLazyExpiry, type LazyExpiryPlan } from "@/features/room/server/services/room-expiry.service";

type Outcome = { kind: "ok"; value: Message; plan: LazyExpiryPlan } | { kind: "error"; code: ErrorCode; plan: LazyExpiryPlan | null };

/**
 * api-contract › sendMessage (BR-23, SUP-07). Trim + độ dài → transaction: thành viên → lazy expiry (phòng `closed`
 * → `NOT_ROOM_MEMBER`) → rate limit theo `chat_recent_at` → tạo tin (chép tên/ảnh lúc gửi). Không ghi `last_event`.
 */
export async function sendMessage(uid: string, input: SendMessageInput): Promise<Message> {
  const normalized = normalizeMessage(input.text);
  if (!normalized.ok) throw new AppError(normalized.code);
  const { roomId } = input;
  const at = now();

  const outcome = await runTransaction<Outcome>(async (tx: Transaction) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== roomId) return { kind: "error", code: "NOT_ROOM_MEMBER", plan: null };
    const recent = await getChatRecentAtInTx(tx, uid);

    const plan = await planLazyExpiry(tx, { roomId, now: at });
    const room = plan.room;
    plan.apply(tx);
    if (!room || plan.status === "closed" || plan.status === null) return { kind: "error", code: "NOT_ROOM_MEMBER", plan };

    const rate = checkChatRate(recent, at);
    if (!rate.allowed) return { kind: "error", code: "RATE_LIMITED", plan };

    setChatRecentAtInTx(tx, uid, rate.nextRecent);
    const id = createMessageInTx(tx, roomId, {
      senderUid: uid,
      senderName: me.displayName,
      senderPhotoUrl: me.photoUrl,
      text: normalized.text,
      now: at,
      expireAt: expireAtFrom(room.createdAt),
    });
    const value: Message = {
      id,
      senderUid: uid,
      senderName: me.displayName,
      senderPhotoUrl: me.photoUrl,
      text: normalized.text,
      createdAt: at.toISOString(),
    };
    return { kind: "ok", value, plan };
  });

  if (outcome.plan) await outcome.plan.afterCommit();
  if (outcome.kind === "error") throw new AppError(outcome.code);
  return outcome.value;
}
