"use client";

import "client-only";

import { useCallback, useState } from "react";
import { useDocListener } from "@/core/client/hooks/use-doc-listener";
import { mapGameDoc } from "@/features/room/client";
import type { GameView } from "@/features/room/shared/types";
import type { PlayerView } from "@/features/ticket/shared/types";
import { mapPlayerDoc } from "./use-game-room";

/** Ván đang diễn ra (đã Bắt đầu, chưa kết thúc) — đáng theo dõi kết quả. */
const isLive = (status: GameView["status"]) => status === "running" || status === "paused" || status === "awaiting_confirm";

export type FinishedGameState = {
  /** Ván vừa kết thúc (`finished`) cần hiện overlay SCR-09 trang 4; null = không có. */
  game: GameView | null;
  /** Mình có vé ở ván vừa xong: `kept` còn vé ở ván mới, `released` bị trả vé (BR-29); null = không có vé. */
  ticketLine: "kept" | "released" | null;
  /** Ván mới (`seq_no`) để hiện "Vé được giữ cho ván {n}". */
  nextSeqNo: number;
  dismiss: () => void;
};

/**
 * SCR-09.A0: giữ gameId của ván đang diễn ra; khi `rooms.current_game_id` chuyển sang ván mới (confirmGame / hết
 * 90 số) → nghe doc ván cũ; `finished` → overlay giữ dữ liệu ván cũ tới khi bấm "Đóng" (AC-11). Chỉ hiện khi đang
 * theo dõi lúc chuyển ván (vào lại sau đó thì không).
 */
export function useFinishedGame(opts: {
  roomId: string;
  uid: string;
  current: GameView | null;
  currentPlayers: readonly PlayerView[];
  playersReady: boolean;
}): FinishedGameState {
  const { roomId, uid, current, currentPlayers, playersReady } = opts;
  const [watchId, setWatchId] = useState<string | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const currentId = current?.id ?? null;
  const currentLive = current ? isLive(current.status) : false;
  // Ván hiện tại đang diễn ra → theo dõi nó (cập nhật state trong render — mẫu "điều chỉnh state theo prop").
  if (currentId && currentLive && watchId !== currentId) setWatchId(currentId);

  const oldId = watchId && watchId !== currentId ? watchId : null;
  const old = useDocListener(oldId ? `rooms/${roomId}/games/${oldId}` : null, mapGameDoc);
  const oldMe = useDocListener(oldId ? `rooms/${roomId}/games/${oldId}/players/${uid}` : null, mapPlayerDoc);

  const finished = oldId && old.data && old.data.status === "finished" && dismissedId !== oldId ? old.data : null;
  const hadTickets = (oldMe.data?.ticketIds.length ?? 0) > 0;
  const keeps = currentPlayers.some((p) => p.uid === uid && p.ticketIds.length > 0);
  const ticketLine = finished && hadTickets && playersReady ? (keeps ? "kept" : "released") : null;

  const dismiss = useCallback(() => {
    setDismissedId(oldId);
    setWatchId(null);
  }, [oldId]);

  return { game: finished, ticketLine, nextSeqNo: current?.seqNo ?? 0, dismiss };
}
