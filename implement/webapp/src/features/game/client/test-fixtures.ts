import type { GameRoomState } from "@/features/game/client/hooks/use-game-room";
import type { GameStatus, GameView, RoomView, TicketId } from "@/features/room/shared/types";
import type { PlayerView, TicketView } from "@/features/ticket/shared/types";

/** Lưới 9×9 mỗi hàng 5 số (cột 0,2,4,6,8) — hàng r: base + r*10 + 1..5. */
export function makeGrid(base: number): number[] {
  return Array.from({ length: 81 }, (_, i) => {
    const row = Math.floor(i / 9);
    const col = i % 9;
    return col % 2 === 0 ? base + row * 10 + col / 2 + 1 : 0;
  });
}

export function makeTicket(id: TicketId, base = 0): TicketView {
  return { id, color: id.split("_")[0] as TicketView["color"], side: id.endsWith("_a") ? "a" : "b", grid: makeGrid(base), setNo: 1 };
}

export const HOST = "u_host";
export const ME = "u_me";

export function makeRoom(over: Partial<RoomView> = {}): RoomView {
  return {
    id: "r1",
    name: "Lô tô Tết",
    hostUid: HOST,
    status: "active",
    memberCount: 3,
    inviteCode: "invite",
    joinCode: "ABC234",
    expiresAt: new Date(Date.now() + 3_600_000),
    currentGameId: "g1",
    gameCount: 1,
    drawIntervalSec: 5,
    calledNumbers: [],
    closeReason: null,
    lastEvent: null,
    ...over,
  };
}

export function makeGame(status: GameStatus, over: Partial<GameView> = {}): GameView {
  return {
    id: "g1",
    seqNo: 1,
    status,
    pauseReason: status === "paused" ? "host" : null,
    nextCallAt: status === "running" ? new Date(Date.now() + 3000) : null,
    resumeStatus: status === "awaiting_confirm" ? "running" : null,
    claims: [],
    playerCount: 2,
    result: null,
    winners: [],
    confirmedBy: null,
    ...over,
  };
}

export function makeState(over: Partial<GameRoomState> = {}): GameRoomState {
  const players: PlayerView[] = [];
  return {
    userStatus: "ready",
    user: { displayName: "X", photoUrl: null, currentRoomId: "r1" },
    roomId: "r1",
    room: makeRoom(),
    roomStatus: "ready",
    game: makeGame("waiting"),
    gameStatus: "ready",
    offline: false,
    players,
    playersReady: true,
    me: null,
    myTickets: [],
    ticketsReady: true,
    ...over,
  };
}
