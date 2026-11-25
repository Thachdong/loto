"use client";

import "client-only";

import { voicePackOf } from "@/features/room/shared/domain/voice-pack";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { DocumentData } from "firebase/firestore";
import { useDocListener, type DocListenerStatus } from "@/core/client/hooks/use-doc-listener";
import { writeLeaveReason } from "@/features/room/client/lib/leave-reason-store";
import { leaveReasonRecord } from "@/features/room/client/lib/infer-leave-reason";
import type {
  CloseReason,
  GameStatus,
  GameView,
  LeaveReasonRecord,
  RoomStatus,
  RoomView,
  TicketColor,
  TicketId,
} from "@/features/room/shared/types";

/** Phần `users/{uid}` màn phòng/trang chủ cần (TBL-01). */
export type CurrentUserView = {
  displayName: string;
  photoUrl: string | null;
  currentRoomId: string | null;
};

type Timestampish = { toDate: () => Date } | Date | null | undefined;
const toDate = (value: Timestampish): Date =>
  value instanceof Date ? value : value && typeof value.toDate === "function" ? value.toDate() : new Date(0);
const str = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown): number => (typeof value === "number" ? value : 0);

/** users/{uid} snake_case → camelCase. */
export function mapUserDoc(data: DocumentData): CurrentUserView {
  return {
    displayName: str(data.display_name),
    photoUrl: typeof data.photo_url === "string" && data.photo_url ? data.photo_url : null,
    currentRoomId: typeof data.current_room_id === "string" && data.current_room_id ? data.current_room_id : null,
  };
}

/** rooms/{id} (TBL-02) → RoomView. */
export function mapRoomDoc(data: DocumentData, id: string): RoomView {
  const lastEvent = data.last_event as
    | { type?: unknown; target_uid?: unknown; text?: unknown; at?: Timestampish }
    | null
    | undefined;
  return {
    id,
    name: str(data.name),
    hostUid: str(data.host_uid),
    status: (str(data.status) || "active") as RoomStatus,
    memberCount: num(data.member_count),
    inviteCode: str(data.invite_code),
    joinCode: str(data.join_code),
    expiresAt: toDate(data.expires_at as Timestampish),
    currentGameId: str(data.current_game_id),
    gameCount: num(data.game_count),
    drawIntervalSec: num(data.draw_interval_sec) || 5,
    voicePack: voicePackOf(data.voice_pack),
    calledNumbers: Array.isArray(data.called_numbers) ? (data.called_numbers as unknown[]).filter((n): n is number => typeof n === "number") : [],
    closeReason: (typeof data.close_reason === "string" ? data.close_reason : null) as CloseReason | null,
    lastEvent:
      lastEvent && typeof lastEvent === "object"
        ? {
            type: str(lastEvent.type),
            targetUid: typeof lastEvent.target_uid === "string" ? lastEvent.target_uid : null,
            text: typeof lastEvent.text === "string" && lastEvent.text ? lastEvent.text : null,
            atMs: lastEvent.at ? toDate(lastEvent.at).getTime() : null,
          }
        : null,
  };
}

/** rooms/{id}/games/{gid} (TBL-05) → GameView. */
export function mapGameDoc(data: DocumentData, id: string): GameView {
  const claims = Array.isArray(data.claims) ? (data.claims as Record<string, unknown>[]) : [];
  return {
    id,
    seqNo: num(data.seq_no),
    status: (str(data.status) || "waiting") as GameStatus,
    pauseReason: data.pause_reason === "host" ? "host" : null,
    nextCallAt: data.next_call_at ? toDate(data.next_call_at as Timestampish) : null,
    resumeStatus: data.resume_status === "running" || data.resume_status === "paused" ? data.resume_status : null,
    claims: claims.map((c) => ({
      uid: str(c.uid),
      displayName: str(c.display_name),
      ticketId: str(c.ticket_id) as TicketId,
      color: str(c.color) as TicketColor,
      result: c.result === "win" ? "win" : "miss",
      row: typeof c.row === "number" ? c.row : null,
      claimedAtMs: toDate(c.claimed_at as Timestampish).getTime(),
    })),
    playerCount: num(data.player_count),
    result: data.result === "won" || data.result === "no_winner" ? data.result : null,
    winners: (Array.isArray(data.winners) ? (data.winners as Record<string, unknown>[]) : []).map((w) => ({
      uid: str(w.uid),
      displayName: str(w.display_name),
      ticketId: str(w.ticket_id) as TicketId,
      color: str(w.color) as TicketColor,
      row: num(w.row),
      claimedAtMs: w.claimed_at ? toDate(w.claimed_at as Timestampish).getTime() : 0,
    })),
    confirmedBy: str(data.confirmed_by) || null,
  };
}

function subscribeOnline(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}
const getOnline = () => navigator.onLine;
const getOnlineServer = () => true;

export type CurrentRoomState = {
  userStatus: DocListenerStatus;
  user: CurrentUserView | null;
  /** `current_room_id` hiệu lực: từ listener `users`, trước snapshot đầu dùng `initialRoomId`. */
  roomId: string | null;
  room: RoomView | null;
  roomStatus: DocListenerStatus;
  game: GameView | null;
  gameStatus: DocListenerStatus;
  /** Listener `users` lỗi hoặc trình duyệt offline → banner "Mất kết nối – đang thử lại…". */
  offline: boolean;
};

type Options = {
  uid: string;
  /** `current_room_id` server đọc lúc render (RSC). */
  initialRoomId: string | null;
  /** Phòng ép nghe thêm khi `users` chưa báo (VD sau `ALREADY_IN_ROOM`). */
  fallbackRoomId?: string | null;
  /** Gọi khi `current_room_id` chuyển từ X sang null — đã ghi lý do vào sessionStorage. */
  onLeave?: (record: LeaveReasonRecord) => void;
};

/**
 * SCR-02.A0 / `/room`: nghe `users/{uid}` → `rooms/{current_room_id}` → `games/{current_game_id}` (CHỈ ĐỌC).
 * Khi `current_room_id` từ X thành null → suy lý do từ snapshot cuối của X → `sessionStorage['loto:leaveReason']`.
 */
export function useCurrentRoom({ uid, initialRoomId, fallbackRoomId = null, onLeave }: Options): CurrentRoomState {
  const userState = useDocListener(`users/${uid}`, mapUserDoc);
  const userKnown = userState.status === "ready" || (userState.status === "error" && userState.data !== null);
  const userRoomId = userKnown ? (userState.data?.currentRoomId ?? null) : initialRoomId;
  const roomId = userRoomId ?? fallbackRoomId;

  // Snapshot cuối của từng phòng đã nghe (giữ cả khi listener phòng đã bị hủy / bị rules chặn).
  // Ghi ngay trong callback snapshot: tab nền có thể nhận "phòng closed" và "current_room_id = null"
  // cùng một lượt render, khi đó render đã đổi path phòng sang null và không bao giờ thấy bản closed.
  const lastRoom = useRef<RoomView | null>(null);
  const rememberRoom = useCallback((data: RoomView | null) => {
    if (data) lastRoom.current = data;
  }, []);

  const roomState = useDocListener(roomId ? `rooms/${roomId}` : null, mapRoomDoc, rememberRoom);
  const room = roomState.data;
  const gameId = room?.currentGameId || null;
  const gameState = useDocListener(roomId && gameId ? `rooms/${roomId}/games/${gameId}` : null, mapGameDoc);

  const online = useSyncExternalStore(subscribeOnline, getOnline, getOnlineServer);

  const prevRoomId = useRef<string | null>(initialRoomId);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    if (!userKnown) return;
    const previous = prevRoomId.current;
    prevRoomId.current = userRoomId;
    if (previous && userRoomId === null) {
      const snapshot = lastRoom.current?.id === previous ? lastRoom.current : null;
      const record = leaveReasonRecord(snapshot, uid, new Date());
      writeLeaveReason(record);
      onLeaveRef.current?.(record);
    }
  }, [userKnown, userRoomId, uid]);

  return {
    userStatus: userState.status,
    user: userState.data,
    roomId,
    room: room && room.id === roomId ? room : null,
    roomStatus: roomState.status,
    game: gameState.data,
    gameStatus: gameState.status,
    offline: userState.status === "error" || !online,
  };
}
