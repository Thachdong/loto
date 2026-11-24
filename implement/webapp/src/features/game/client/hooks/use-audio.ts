"use client";

import "client-only";

import { useEffect, useRef } from "react";
import { isSoundOn } from "@/features/game/client/lib/sound-pref";
import type { AudioEngine } from "@/features/game/client/lib/audio-engine";
import { getAudioEngine } from "@/features/game/client/lib/audio-singleton";
import type { GameView, RoomView } from "@/features/room/shared/types";

type Options = {
  room: RoomView | null;
  game: GameView | null;
  /** `serverTime − localTime` (ms), để tính thời gian còn lại tới số kế tiếp (câu nối). */
  offsetMs: number;
  engine?: AudioEngine;
  /** Đồng hồ đo độ trễ; mặc định `performance.now()`. */
  now?: () => number;
};

/**
 * SCR-04.A1 (tiếng rao): phát khi `called_numbers` TĂNG sau lần tải đầu (số trong lúc mất kết nối/vào muộn không phát lại),
 * "KINH!" (+ rung) khi `last_event` mới là `claim_submitted`, tiếng kinh hụt khi `claims_rejected`, chúc mừng khi
 * `game_finished` (SUP-02). Tắt tiếng / chưa chạm bật → im.
 */
export function useAudio({ room, game, offsetMs, engine, now }: Options): void {
  const roomId = room?.id ?? null;
  const called = room?.calledNumbers ?? null;
  const calledLen = called?.length ?? null;
  const lastNumber = calledLen ? (called?.[calledLen - 1] ?? null) : null;
  const eventType = room?.lastEvent?.type ?? null;
  const eventAt = room?.lastEvent?.atMs ?? null;
  const nextCallMs = game?.nextCallAt?.getTime() ?? null;

  const seenCount = useRef<{ roomId: string; len: number } | null>(null);
  const seenEvent = useRef<{ roomId: string; key: string } | null>(null);
  const nextCallRef = useRef(nextCallMs);
  const offsetRef = useRef(offsetMs);
  // Cập nhật trong effect (khai báo trước effect phát tiếng nên luôn chạy trước).
  useEffect(() => {
    nextCallRef.current = nextCallMs;
    offsetRef.current = offsetMs;
  }, [nextCallMs, offsetMs]);

  useEffect(() => {
    if (!roomId || calledLen === null) {
      seenCount.current = null;
      return;
    }
    const receivedAt = (now ?? (() => performance.now()))();
    const previous = seenCount.current;
    seenCount.current = { roomId, len: calledLen };
    if (!previous || previous.roomId !== roomId) return; // snapshot đầu
    if (calledLen <= previous.len || lastNumber === null) return; // chỉ phát khi TĂNG
    const audio = engine ?? getAudioEngine();
    if (!audio.isUnlocked() || !isSoundOn()) return;
    const remainingMs = nextCallRef.current === null ? undefined : nextCallRef.current - (Date.now() + offsetRef.current);
    void audio.playNumber(lastNumber, { receivedAt, remainingMs });
  }, [roomId, calledLen, lastNumber, engine, now]);

  useEffect(() => {
    if (!roomId) {
      seenEvent.current = null;
      return;
    }
    const receivedAt = (now ?? (() => performance.now()))();
    const key = `${eventType}:${eventAt}`;
    const previous = seenEvent.current;
    seenEvent.current = { roomId, key };
    if (!previous || previous.roomId !== roomId || previous.key === key) return;
    const kind =
      eventType === "claim_submitted"
        ? "kinh"
        : eventType === "claims_rejected"
          ? "miss"
          : eventType === "game_finished"
            ? "congrats"
            : null;
    if (!kind) return;
    // SCR-09 §5: rung nhẹ khi có lượt KINH mới (nếu máy hỗ trợ).
    if (kind === "kinh") {
      try {
        navigator.vibrate?.(80);
      } catch {
        /* bỏ qua */
      }
    }
    const audio = engine ?? getAudioEngine();
    if (!audio.isUnlocked() || !isSoundOn()) return;
    void audio.playEvent(kind, { receivedAt });
  }, [roomId, eventType, eventAt, engine, now]);
}
