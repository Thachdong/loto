"use client";

import "client-only";

import { useEffect, useRef } from "react";
import type { StreamPlayer } from "@/features/game/client/lib/stream-player";
import { getStreamPlayer } from "@/features/game/client/lib/stream-singleton";
import type { RoomView } from "@/features/room/shared/types";

type Options = {
  room: RoomView | null;
  soundOn: boolean;
  player?: StreamPlayer;
};

/**
 * SCR-04.A1 (tiếng rao — ADR-08 sửa đổi): server phát số / KINH / kinh hụt / chúc mừng trong 1 luồng audio của phòng;
 * hook chỉ gắn player vào phòng và bật/tắt theo cài đặt tiếng. Rung nhẹ khi có lượt KINH mới (SCR-09 §5).
 */
export function useAudio({ room, soundOn, player }: Options): void {
  const roomId = room?.id ?? null;
  const eventType = room?.lastEvent?.type ?? null;
  const eventAt = room?.lastEvent?.atMs ?? null;
  const seenEvent = useRef<string | null>(null);

  useEffect(() => {
    const p = player ?? getStreamPlayer();
    p.attach(roomId);
    return () => p.attach(null);
  }, [roomId, player]);

  useEffect(() => {
    (player ?? getStreamPlayer()).setMuted(!soundOn);
  }, [soundOn, player]);

  useEffect(() => {
    const key = roomId ? `${roomId}:${eventType}:${eventAt}` : null;
    const previous = seenEvent.current;
    seenEvent.current = key;
    if (previous === null || key === previous || eventType !== "claim_submitted") return;
    try {
      navigator.vibrate?.(80);
    } catch {
      /* bỏ qua */
    }
  }, [roomId, eventType, eventAt]);
}
