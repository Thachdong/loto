"use client";

import "client-only";

import { useEffect, useMemo, useRef, useState } from "react";
import { collection, getDocs, type DocumentData } from "firebase/firestore";
import { getClientFirestore } from "@/core/client/firebase";
import { useCollectionListener } from "@/core/client/hooks/use-collection-listener";
import { sortHistory, toHistoryCard, type HistoryCard, type HistoryGame } from "@/features/history/shared/domain/history-card";
import type { TicketColor, TicketId } from "@/features/room/shared/types";

type Timestampish = { toDate: () => Date } | Date | null | undefined;
const toDate = (v: unknown): Date | null => {
  const t = v as Timestampish;
  if (t instanceof Date) return t;
  return t && typeof t.toDate === "function" ? t.toDate() : null;
};
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** `rooms/{r}/games/{g}` → ván cho lịch sử; ván chưa kết thúc → null (bị lọc). */
export function mapHistoryDoc(data: DocumentData, id: string): HistoryGame | null {
  if (data.status !== "finished" && data.status !== "cancelled") return null;
  const winners = Array.isArray(data.winners) ? (data.winners as Record<string, unknown>[]) : [];
  return {
    id,
    seqNo: typeof data.seq_no === "number" ? data.seq_no : 0,
    status: data.status,
    result: data.result === "won" || data.result === "no_winner" ? data.result : null,
    winners: winners.map((w) => ({
      uid: str(w.uid),
      displayName: str(w.display_name),
      ticketId: str(w.ticket_id) as TicketId,
      color: str(w.color) as TicketColor,
    })),
    startedAt: toDate(data.started_at),
    endedAt: toDate(data.ended_at),
    createdAt: toDate(data.created_at),
  };
}

export type GameHistoryState = {
  status: "idle" | "loading" | "ready" | "error";
  cards: HistoryCard[];
  retry: () => void;
};

/**
 * SCR-08.A0 (CHỈ ĐỌC): nghe realtime `rooms/{roomId}/games` (số ván mỗi phòng ít — lọc `finished`/`cancelled` và
 * sắp `seq_no` giảm dần ở client, không cần composite index). Ảnh người thắng: đọc 1 lần `players` của từng ván có
 * người thắng, cache theo gameId (Q-050).
 */
export function useGameHistory(roomId: string | null, enabled: boolean): GameHistoryState {
  const games = useCollectionListener(enabled && roomId ? `rooms/${roomId}/games` : null, mapHistoryDoc);
  const finished = useMemo(() => sortHistory(games.data.filter((g): g is HistoryGame => g !== null)), [games.data]);

  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const fetched = useRef(new Set<string>());
  useEffect(() => {
    if (!roomId) return;
    for (const g of finished) {
      if (g.winners.length === 0 || fetched.current.has(g.id)) continue;
      fetched.current.add(g.id);
      getDocs(collection(getClientFirestore(), `rooms/${roomId}/games/${g.id}/players`))
        .then((snap) => {
          const next: Record<string, string | null> = {};
          for (const d of snap.docs) {
            const url = d.data().photo_url;
            next[`${g.id}:${d.id}`] = typeof url === "string" && url ? url : null;
          }
          setPhotos((prev) => ({ ...prev, ...next }));
        })
        .catch(() => fetched.current.delete(g.id));
    }
  }, [roomId, finished]);

  const cards = useMemo(
    () =>
      finished.map((g) =>
        toHistoryCard(g, Object.fromEntries(g.winners.map((w) => [w.uid, photos[`${g.id}:${w.uid}`] ?? null]))),
      ),
    [finished, photos],
  );

  return { status: games.status, cards, retry: games.retry };
}
