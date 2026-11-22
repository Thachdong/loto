"use client";

import "client-only";

import { useEffect, useMemo, useState } from "react";
import type { ActionResult } from "@/core/shared/action-result";
import { drawNumberAction } from "@/features/game/server/actions/draw-number.action";
import { backupIndexOf, backupOrder } from "@/features/game/shared/domain/backup-order";
import { drawFireAt, type DrawRole } from "@/features/game/shared/domain/draw-fire-at";
import type { DrawResult } from "@/features/game/shared/types";
import type { GameView, RoomView } from "@/features/room/shared/types";
import type { PlayerView } from "@/features/ticket/shared/types";

export type DrawCall = (input: { roomId: string; gameId: string; seq: number }) => Promise<ActionResult<DrawResult>>;

type Options = {
  room: RoomView | null;
  game: GameView | null;
  players: readonly PlayerView[];
  meUid: string;
  /** `serverTime − localTime` (ms). */
  offsetMs: number;
  /** Tiêm khi test; mặc định `drawNumberAction`. */
  draw?: DrawCall;
};

export const NETWORK_RETRY_MS = 1000;
export const NETWORK_RETRY_MAX = 3;
/** Cộng thêm vào giờ hẹn mỗi lần `DRAW_TOO_EARLY` mà server không kèm giờ chuẩn. */
const TOO_EARLY_BUMP_MS = 300;

function debugLog(payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production") console.debug("[draw]", payload);
}

/** Vai của mình trong việc gọi `drawNumber`: host, người dự phòng thứ k, hoặc `null` (người xem / không vé). */
export function drawRoleOf(meUid: string, hostUid: string, players: readonly PlayerView[]): DrawRole | null {
  if (meUid === hostUid) return "host";
  const k = backupIndexOf(backupOrder(players, hostUid), meUid);
  return k === null ? null : { backupIndex: k };
}

/**
 * SCR-04.A10 / ADR-05: hẹn giờ gọi `drawNumber` khi ván `running`. Host gọi đúng `next_call_at`; người dự phòng thứ k
 * gọi ở `next_call_at + 5k s` (nếu chưa thấy số mới thì effect bị hủy). Hẹn lại khi seq/next_call_at/status/gameId đổi
 * và khi tab hiện lại. Lỗi mạng thử lại 1 giây ≤ 3 lần; `DRAW_TOO_EARLY` chỉnh giờ rồi hẹn lại.
 */
export function useDrawScheduler({ room, game, players, meUid, offsetMs, draw = drawNumberAction }: Options): void {
  const roomId = room?.id ?? null;
  const hostUid = room?.hostUid ?? "";
  const seq = room?.calledNumbers.length ?? 0;
  const gameId = game?.id ?? null;
  const status = game?.status ?? null;
  const nextCallMs = game?.nextCallAt?.getTime() ?? null;

  const role = useMemo(() => drawRoleOf(meUid, hostUid, players), [meUid, hostUid, players]);
  const roleKey = role === null ? "none" : role === "host" ? "host" : `b${role.backupIndex}`;

  const [tick, setTick] = useState(0);
  /** Hiệu chỉnh từ `DRAW_TOO_EARLY`, gắn với (gameId, seq) để tự bỏ khi số mới tới. */
  const [fix, setFix] = useState<{ key: string; extraMs: number; nextCallMs: number | null }>({ key: "", extraMs: 0, nextCallMs: null });
  const fixKey = `${gameId}:${seq}`;
  const applied = fix.key === fixKey ? fix : { key: fixKey, extraMs: 0, nextCallMs: null };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!roomId || !gameId || status !== "running" || nextCallMs === null || role === null) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const baseMs = applied.nextCallMs ?? nextCallMs;
    const fireAt = drawFireAt({ nextCallAt: baseMs, role, serverOffsetMs: offsetMs }) + applied.extraMs;
    const delay = Math.max(0, fireAt - Date.now());
    debugLog({ op: "schedule", roomId, gameId, seq, role: roleKey, delayMs: Math.round(delay) });

    const attempt = async (retry: number) => {
      if (cancelled) return;
      try {
        const result = await draw({ roomId, gameId, seq });
        if (cancelled) return;
        if (result.ok) {
          debugLog({ op: "draw", roomId, gameId, seq, role: roleKey, drawn: result.data.drawn });
          return;
        }
        const code = result.error.code;
        debugLog({ op: "draw", roomId, gameId, seq, role: roleKey, code });
        if (code === "DRAW_TOO_EARLY") {
          const detail = result.error.details?.find((d) => d.code === "nextCallAt");
          const parsed = typeof detail?.nextCallAt === "string" ? Date.parse(detail.nextCallAt) : NaN;
          setFix({
            key: fixKey,
            extraMs: applied.extraMs + TOO_EARLY_BUMP_MS,
            nextCallMs: Number.isFinite(parsed) ? parsed : applied.nextCallMs,
          });
        }
        // Lỗi nghiệp vụ khác (GAME_NOT_RUNNING, GAME_STALE…): bỏ qua, listener cập nhật UI.
      } catch {
        if (cancelled || retry >= NETWORK_RETRY_MAX) return;
        debugLog({ op: "retry", roomId, gameId, seq, retry: retry + 1 });
        timer = setTimeout(() => void attempt(retry + 1), NETWORK_RETRY_MS);
      }
    };

    timer = setTimeout(() => void attempt(0), delay);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    // `applied` đã gói vào extraMs/nextCallMs; `draw` ổn định theo caller.
  }, [roomId, gameId, status, nextCallMs, seq, roleKey, role, offsetMs, tick, applied.extraMs, applied.nextCallMs, fixKey, draw]);
}
