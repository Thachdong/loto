import "server-only";

import { t } from "@/core/shared/i18n/vi";
import { checkClaim } from "@/features/game/shared/domain/check-claim";
import type { CreateClaimInput } from "@/features/game/shared/schemas/create-claim";
import type { ClaimResult } from "@/features/game/shared/types";
import { appendClaimInTx } from "@/features/room/db/game.repository";
import { setRoomEventInTx } from "@/features/room/db/room.repository";
import type { TicketId } from "@/features/room/shared/types";
import { getPlayerInTx, getTicketGridInTx } from "@/features/ticket/db/ticket.repository";
import { fail, inGameRoom, ok } from "./game-room";

/**
 * api-contract › createClaim (BR-17, Q-055). Thứ tự lỗi: (`ticketId` regex ở schema) → thành viên →
 * `GAME_STALE` → `CLAIMS_CLOSED` (ngoài running/paused/awaiting_confirm) → `NOT_TICKET_HOLDER` →
 * `TICKET_ALREADY_CLAIMED`. Lượt KINH được append vào `claims` kèm gợi ý win/miss; ván `running`/`paused`
 * sang `awaiting_confirm`; đã `awaiting_confirm` thì chỉ append.
 */
export async function createClaim(uid: string, input: CreateClaimInput): Promise<ClaimResult> {
  const ticketId = input.ticketId as TicketId;
  return inGameRoom<ClaimResult>(uid, input.roomId, async (tx, ctx) => {
    const { room, game, at } = ctx;
    if (input.gameId !== room.currentGameId) return fail("GAME_STALE");
    if (game.status !== "running" && game.status !== "paused" && game.status !== "awaiting_confirm") {
      return fail("CLAIMS_CLOSED");
    }

    const player = await getPlayerInTx(tx, input.roomId, game.id, uid);
    if (!player || !player.ticketIds.includes(ticketId)) return fail("NOT_TICKET_HOLDER");
    if (game.claims.some((c) => c.ticketId === ticketId)) return fail("TICKET_ALREADY_CLAIMED");

    const ticket = await getTicketGridInTx(tx, input.roomId, ticketId);
    if (!ticket) return fail("NOT_TICKET_HOLDER");
    const check = checkClaim(ticket.grid, room.calledNumbers);
    const result = check.win ? "win" : "miss";

    ctx.applyExpiry(tx);
    appendClaimInTx(
      tx,
      input.roomId,
      game.id,
      game.claims,
      { uid, displayName: player.displayName, ticketId, color: ticket.color, result, row: check.row, claimedAt: at },
      game.status === "awaiting_confirm" ? null : { resumeStatus: game.status },
    );
    setRoomEventInTx(tx, input.roomId, {
      type: "claim_submitted",
      text: t("toast.claimSubmitted", { name: player.displayName }),
      actorUid: uid,
      targetUid: null,
      now: at,
    });
    return ok({
      result,
      ticketId,
      row: check.row,
      gameStatus: "awaiting_confirm",
    });
  });
}
