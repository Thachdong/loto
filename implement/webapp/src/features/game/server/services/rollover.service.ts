import "server-only";

import type { Transaction } from "firebase-admin/firestore";
import { createNextGameInTx, newGameId } from "@/features/room/db/game.repository";
import type { GameRecord, RoomRecord } from "@/features/room/db/room.mapper";
import type { RoomEvent } from "@/features/room/db/room.repository";
import { copyPlayersInTx, getPlayerStatusInTx, listPlayersInTx } from "@/features/ticket/db/ticket.repository";
import type { PlayerRecord } from "@/features/ticket/db/player.mapper";

/**
 * Pha ĐỌC của rollover (BR-11, BR-29): player của ván vừa xong mà còn trong phòng (`users.current_room_id`)
 * VÀ đang online (`presence` đọc từ RTDB TRƯỚC transaction). Gọi trước mọi lệnh ghi của transaction.
 */
export async function loadRolloverPlayers(
  tx: Transaction,
  roomId: string,
  gameId: string,
  presence: Readonly<Record<string, boolean>>,
): Promise<PlayerRecord[]> {
  const players = await listPlayersInTx(tx, roomId, gameId);
  const status = await getPlayerStatusInTx(
    tx,
    players.map((p) => p.uid),
  );
  return players.filter((p) => status[p.uid]?.currentRoomId === roomId && presence[p.uid] === true);
}

export type RolloverInput = {
  room: RoomRecord;
  /** Ván vừa kết thúc (người gọi tự ghi `finished`). */
  finishedGame: GameRecord;
  /** Kết quả `loadRolloverPlayers`. */
  carried: readonly PlayerRecord[];
  event: RoomEvent;
  now: Date;
};

/**
 * Dùng chung (T-006 hết 90 số, T-007 confirmGame/no_winner): tạo ván kế `waiting` (`seq_no + 1`), trỏ phòng
 * (`current_game_id`, `game_count + 1`, `last_event = event`), chép player còn trong phòng và online sang ván mới.
 * Chỉ ghi — mọi đọc phải xong trước (xem `loadRolloverPlayers`). Trả id ván mới.
 */
export function rolloverToNewGame(tx: Transaction, input: RolloverInput): string {
  const { room, finishedGame, carried, event, now } = input;
  const gameId = newGameId(room.id);
  createNextGameInTx(tx, room.id, { gameId, seqNo: finishedGame.seqNo + 1, roomCreatedAt: room.createdAt, now }, event);
  copyPlayersInTx(tx, room.id, gameId, carried, room.createdAt, now);
  return gameId;
}
