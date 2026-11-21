import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { AppError } from "@/core/server/action";
import { now } from "@/core/server/clock";
import { cryptoRng } from "@/core/server/random";
import type { ErrorDetail } from "@/core/shared/action-result";
import type { ErrorCode } from "@/core/shared/errors";
import { getUserInTx } from "@/features/auth/db/user.repository";
import type { GameRecord, RoomRecord } from "@/features/room/db/room.mapper";
import {
  getGameInTx,
  renewTicketSetInRoomInTx,
  runTransaction,
  setRoomEventInTx,
} from "@/features/room/db/room.repository";
import { planLazyExpiry, type LazyExpiryPlan } from "@/features/room/server/services/room-expiry.service";
import { generateTicketSet } from "@/features/room/shared/domain/generate-ticket-set";
import type { TicketId } from "@/features/room/shared/types";
import {
  deletePlayerInTx,
  getPlayerInTx,
  getTicketExistsInTx,
  listPlayersInTx,
  overwriteTicketGridsInTx,
  readPresenceOnline,
  readRoomPresence,
  removeTicketFromPlayerInTx,
  upsertPlayerTicketInTx,
} from "@/features/ticket/db/ticket.repository";
import { MAX_TICKETS_PER_PLAYER } from "@/features/ticket/shared/constants";
import type { ReclaimPlayerTicketsInput } from "@/features/ticket/shared/schemas/reclaim-player-tickets";
import type { ReleaseTicketInput } from "@/features/ticket/shared/schemas/release-ticket";
import type { RenewTicketSetInput } from "@/features/ticket/shared/schemas/renew-ticket-set";
import type { TakeTicketInput } from "@/features/ticket/shared/schemas/take-ticket";
import type { MyTickets, ReclaimResult, StillHeldDetail, TicketSetRenewed } from "@/features/ticket/shared/types";

type Failure = { kind: "error"; code: ErrorCode; details?: ErrorDetail[] };
type Success<T> = { kind: "ok"; value: T };
type Step<T> = Success<T> | Failure;

type TxOutcome<T> = Step<T> & { plans: LazyExpiryPlan[] };

type RoomContext = {
  uid: string;
  displayName: string;
  photoUrl: string | null;
  room: RoomRecord;
  game: GameRecord;
  at: Date;
};

const fail = (code: ErrorCode, details?: ErrorDetail[]): Failure => ({ kind: "error", code, details });
const ok = <T>(value: T): Success<T> => ({ kind: "ok", value });

/**
 * Khung chung của 4 action: một transaction, mọi đọc trước mọi ghi. Pha đọc chung: `users/{uid}` → thành viên →
 * `planLazyExpiry` (BR-04) → ván hiện tại; sau đó `body` đọc phần riêng rồi mới ghi. Phòng vừa bị đóng lười
 * → `apply` rồi trả lỗi `NOT_ROOM_MEMBER` (phòng đang `closing` → `GAME_NOT_WAITING`) sau khi commit, `afterCommit` dọn presence.
 */
async function inRoom<T>(
  uid: string,
  roomId: string,
  body: (tx: Transaction, ctx: RoomContext) => Promise<Step<T>>,
): Promise<T> {
  const at = now();
  const outcome = await runTransaction<TxOutcome<T>>(async (tx) => {
    const me = await getUserInTx(tx, uid);
    if (!me) throw new AppError("UNAUTHENTICATED");
    if (me.currentRoomId !== roomId) return { ...fail("NOT_ROOM_MEMBER"), plans: [] };

    const plan = await planLazyExpiry(tx, { roomId, now: at });
    const room = plan.room;
    if (!room || plan.status === "closed" || plan.status === null) {
      plan.apply(tx);
      return { ...fail("NOT_ROOM_MEMBER"), plans: [plan] };
    }
    if (plan.outcome === "closing") {
      plan.apply(tx);
      return { ...fail("GAME_NOT_WAITING"), plans: [plan] };
    }
    const game = plan.game ?? (await getGameInTx(tx, roomId, room.currentGameId));
    if (!game) return { ...fail("NOT_ROOM_MEMBER"), plans: [] };

    const step = await body(tx, { uid, displayName: me.displayName, photoUrl: me.photoUrl, room, game, at });
    return { ...step, plans: [] };
  });

  for (const plan of outcome.plans) await plan.afterCommit();
  if (outcome.kind === "error") throw new AppError(outcome.code, outcome.details);
  return outcome.value;
}

/**
 * api-contract › takeTicket (BR-09, BR-10). Thứ tự lỗi: không phải thành viên → vé không tồn tại → ván không
 * `waiting` → vé đã có chủ → đã giữ 2 vé. Đọc cả collection `players` (≤ 16 doc) và lọc trong bộ nhớ để hai
 * transaction cùng lấy một vé xung đột nhau (người commit sau retry → `TICKET_TAKEN`).
 */
export async function takeTicket(uid: string, input: TakeTicketInput): Promise<MyTickets> {
  const ticketId = input.ticketId as TicketId;
  return inRoom<MyTickets>(uid, input.roomId, async (tx, ctx) => {
    if (!(await getTicketExistsInTx(tx, input.roomId, ticketId))) return fail("TICKET_NOT_FOUND");
    if (ctx.game.status !== "waiting") return fail("GAME_NOT_WAITING");

    const players = await listPlayersInTx(tx, input.roomId, ctx.game.id);
    if (players.some((p) => p.ticketIds.includes(ticketId))) return fail("TICKET_TAKEN");
    const mine = players.find((p) => p.uid === uid);
    if ((mine?.ticketIds.length ?? 0) >= MAX_TICKETS_PER_PLAYER) return fail("TICKET_LIMIT_REACHED");

    upsertPlayerTicketInTx(
      tx,
      input.roomId,
      ctx.game.id,
      uid,
      {
        displayName: ctx.displayName,
        photoUrl: ctx.photoUrl,
        ticketId,
        joinedAt: ctx.at,
        roomCreatedAt: ctx.room.createdAt,
      },
      mine !== undefined,
    );
    return ok({ gameId: ctx.game.id, ticketIds: [...(mine?.ticketIds ?? []), ticketId] });
  });
}

/** api-contract › releaseTicket (BR-10, Q-047): `arrayRemove`, giữ doc player với `[]`. */
export async function releaseTicket(uid: string, input: ReleaseTicketInput): Promise<MyTickets> {
  const ticketId = input.ticketId as TicketId;
  return inRoom<MyTickets>(uid, input.roomId, async (tx, ctx) => {
    if (!(await getTicketExistsInTx(tx, input.roomId, ticketId))) return fail("TICKET_NOT_FOUND");
    if (ctx.game.status !== "waiting") return fail("GAME_NOT_WAITING");

    const mine = await getPlayerInTx(tx, input.roomId, ctx.game.id, uid);
    if (!mine?.ticketIds.includes(ticketId)) return fail("TICKET_NOT_HELD");

    removeTicketFromPlayerInTx(tx, input.roomId, ctx.game.id, uid, ticketId);
    return ok({ gameId: ctx.game.id, ticketIds: mine.ticketIds.filter((id) => id !== ticketId) });
  });
}

/**
 * api-contract › renewTicketSet (BR-08, BR-12). Presence RTDB đọc TRƯỚC transaction (ngoài Firestore, ADR-06).
 * Thứ tự lỗi: thành viên → host → `waiting` → còn người giữ vé (`TICKETS_STILL_HELD`).
 */
export async function renewTicketSet(uid: string, input: RenewTicketSetInput): Promise<TicketSetRenewed> {
  const presence = await readRoomPresence(input.roomId);
  return inRoom<TicketSetRenewed>(uid, input.roomId, async (tx, ctx) => {
    if (ctx.room.hostUid !== uid) return fail("NOT_ROOM_HOST");
    if (ctx.game.status !== "waiting") return fail("GAME_NOT_WAITING");

    const players = await listPlayersInTx(tx, input.roomId, ctx.game.id);
    const holders = players.filter((p) => p.ticketIds.length > 0);
    if (holders.length > 0) {
      const details: StillHeldDetail[] = holders.map((p) => ({
        code: "holder",
        uid: p.uid,
        displayName: p.displayName,
        ticketIds: p.ticketIds,
        online: presence[p.uid] === true,
      }));
      return fail("TICKETS_STILL_HELD", details);
    }

    const ticketSetNo = ctx.room.ticketSetNo + 1;
    overwriteTicketGridsInTx(tx, input.roomId, generateTicketSet(cryptoRng()), ticketSetNo, ctx.at);
    renewTicketSetInRoomInTx(tx, input.roomId, ticketSetNo, { actorUid: uid, now: ctx.at });
    return ok({ ticketSetNo });
  });
}

/**
 * api-contract › reclaimPlayerTickets (BR-13). Presence của đích đọc TRƯỚC transaction.
 * Thứ tự lỗi: thành viên → host → không phải chính mình → `waiting` → có doc player → đích offline.
 */
export async function reclaimPlayerTickets(uid: string, input: ReclaimPlayerTicketsInput): Promise<ReclaimResult> {
  const targetOnline = await readPresenceOnline(input.roomId, input.uid);
  return inRoom<ReclaimResult>(uid, input.roomId, async (tx, ctx) => {
    if (ctx.room.hostUid !== uid) return fail("NOT_ROOM_HOST");
    if (input.uid === uid) return fail("CANNOT_TARGET_SELF");
    if (ctx.game.status !== "waiting") return fail("GAME_NOT_WAITING");

    const target = await getPlayerInTx(tx, input.roomId, ctx.game.id, input.uid);
    if (!target) return fail("PLAYER_NOT_FOUND");
    if (targetOnline) return fail("TARGET_ONLINE");

    deletePlayerInTx(tx, input.roomId, ctx.game.id, input.uid);
    setRoomEventInTx(tx, input.roomId, {
      type: "tickets_reclaimed",
      text: target.displayName,
      actorUid: uid,
      targetUid: input.uid,
      now: ctx.at,
    });
    return ok({ uid: input.uid, releasedTicketIds: target.ticketIds });
  });
}
