import type { GameStatus, TicketId } from "@/features/room/shared/types";
import { MAX_TICKETS_PER_PLAYER, TICKET_IDS, ticketColorOf } from "@/features/ticket/shared/constants";
import type {
  PlayerView,
  TicketAction,
  TicketBoard,
  TicketCardVM,
  TicketHolder,
  TicketView,
} from "@/features/ticket/shared/types";
import { partnerOf } from "./partner-ticket";

export type DeriveInput = {
  tickets: readonly TicketView[];
  players: readonly PlayerView[];
  /** `presence/{roomId}` → `{uid: online}`; `null` khi chưa đọc được. Không có key = đã rời / chưa vào. */
  presence: Readonly<Record<string, boolean>> | null;
  gameStatus: GameStatus | null;
  meUid: string;
};

/**
 * SCR-05 #1, #3, #5, #6: 16 thẻ theo thứ tự cố định, người giữ, "Bạn", "Khóa tới hết ván",
 * đếm k/2 và x/16, biến thể nút. Hàm thuần — không I/O.
 */
export function deriveTicketCards(input: DeriveInput): TicketBoard {
  const { tickets, players, presence, gameStatus, meUid } = input;
  const locked = gameStatus !== "waiting";

  const byId = new Map<TicketId, TicketView>(tickets.map((ticket) => [ticket.id, ticket]));
  const holderOf = new Map<TicketId, TicketHolder>();
  for (const player of players) {
    for (const ticketId of player.ticketIds) {
      if (!holderOf.has(ticketId)) {
        holderOf.set(ticketId, { uid: player.uid, displayName: player.displayName, photoUrl: player.photoUrl });
      }
    }
  }

  const myCount = players.find((p) => p.uid === meUid)?.ticketIds.length ?? 0;

  const cards: TicketCardVM[] = TICKET_IDS.map((id) => {
    const holder = holderOf.get(id) ?? null;
    const mine = holder?.uid === meUid;
    const lockedUntilEnd = locked && holder !== null && presence !== null && !(holder.uid in presence);

    let action: TicketAction;
    if (mine) action = locked ? "running" : "release";
    else if (locked) action = "running";
    else if (holder) action = "taken";
    else if (myCount >= MAX_TICKETS_PER_PLAYER) action = "max";
    else action = "take";

    const ticket = byId.get(id) ?? null;
    return {
      id,
      color: ticketColorOf(id),
      side: id.endsWith("_a") ? "a" : "b",
      ticket,
      holder,
      mine,
      lockedUntilEnd,
      action,
      partnerId: partnerOf(id),
    };
  });

  const heldCount = cards.filter((card) => card.holder !== null).length;
  return { cards, myCount, heldCount, soldOut: heldCount === cards.length, locked };
}
