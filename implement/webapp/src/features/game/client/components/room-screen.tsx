"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { usePresence } from "@/core/client/hooks/use-presence";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { OfflineBanner, useRoomEventToast } from "@/features/room/client";
import { TicketSheet } from "@/features/ticket/client";
import { useGameActions } from "@/features/game/client/hooks/use-game-actions";
import { useGameRoom } from "@/features/game/client/hooks/use-game-room";
import { useNow } from "@/features/game/client/hooks/use-now";
import { usePlayMode } from "@/features/game/client/hooks/use-play-mode";
import { LAYOUT_HEIGHTS } from "@/features/game/shared/domain/ticket-layout";
import type { GameView, RoomView } from "@/features/room/shared/types";
import type { PlayerView, TicketView } from "@/features/ticket/shared/types";
import { BottomBar, ComingSoonSheet, type BottomTab } from "./bottom-bar";
import { ClaimCard } from "./claim-card";
import { HostControls, MeStatusLine } from "./host-controls";
import { isKinhVisible, KinhBar } from "./kinh-bar";
import { MyTickets } from "./my-tickets";
import { NumberPanel } from "./number-panel";
import { RoomHeader } from "./room-header";

/** Sheet/dialog đợt B mount vào (Mời, Rời, Bảng 90); đợt A chỉ ghi state. */
export type RoomOverlay = "invite" | "leave" | "board90";

/** Ngữ cảnh đưa cho `renderExtras` — đợt B gắn sheet/dialog/hook (scheduler, expiry, wake lock, audio…) tại đây. */
export type RoomScreenContext = {
  uid: string;
  room: RoomView;
  game: GameView;
  players: PlayerView[];
  me: PlayerView | null;
  myTickets: TicketView[];
  isHost: boolean;
  serverOffsetMs: number;
  overlay: RoomOverlay | null;
  openOverlay: (overlay: RoomOverlay) => void;
  closeOverlay: () => void;
};

type Props = {
  uid: string;
  /** `current_room_id` server đọc lúc render (khác null — page đã redirect nếu null). */
  roomId: string;
  /** `serverTime − localTime` (ms); đợt B nối `useServerTimeOffset`. */
  serverOffsetMs?: number;
  /** Chỗ gắn đợt B: trả về các component (không UI hoặc sheet/dialog) mount cùng màn. */
  renderExtras?: (ctx: RoomScreenContext) => ReactNode;
  /** Phần đặt ngay trên thanh KINH (đợt B: banner kết nối, …) hoặc đầu màn. */
  renderBanner?: (ctx: RoomScreenContext) => ReactNode;
};

/**
 * SCR-04 Phòng chơi: header → panel số → thanh điều khiển host / dòng trạng thái → (thẻ tạm) → vé của tôi
 * → thanh KINH → thanh nút dưới. `current_room_id` thành null → đã ghi lý do → về `/`.
 */
export function RoomScreen({ uid, roomId, serverOffsetMs = 0, renderExtras, renderBanner }: Props) {
  const router = useRouter();
  const state = useGameRoom({ uid, initialRoomId: roomId, onLeave: () => router.replace("/") });
  const { room, game, user, players, me, myTickets } = state;
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [overlay, setOverlay] = useState<RoomOverlay | null>(null);
  const [soonTab, setSoonTab] = useState<Exclude<BottomTab, "tickets"> | null>(null);
  const mode = usePlayMode();
  const nowMs = useNow(room !== null);

  // ADR-06: ghi presence khi đã biết user; toast `last_event` hiện có (đợt B thay bằng use-room-toasts).
  usePresence(user ? roomId : null, user ? { uid, displayName: user.displayName, photoUrl: user.photoUrl } : null);
  useRoomEventToast(room, uid);

  const actions = useGameActions(roomId, game?.id ?? "");

  if (!room || !game) {
    return <RoomSkeleton offline={state.offline} />;
  }

  const isHost = room.hostUid === uid;
  const compact = myTickets.length >= 2;
  const heights = compact ? LAYOUT_HEIGHTS.double : LAYOUT_HEIGHTS.single;
  const dockHeight = heights.bottomBar + (isKinhVisible(game.status, myTickets.length) ? heights.kinhBar : 0);
  const heldCount = players.reduce((sum, p) => sum + p.ticketIds.length, 0);
  const ctx: RoomScreenContext = {
    uid,
    room,
    game,
    players,
    me,
    myTickets,
    isHost,
    serverOffsetMs,
    overlay,
    openOverlay: setOverlay,
    closeOverlay: () => setOverlay(null),
  };
  const openTickets = () => setTicketsOpen(true);
  const expiryRemainingMs = room.expiresAt.getTime() - (nowMs + serverOffsetMs);

  return (
    <main data-testid="room-screen" className="flex h-dvh min-h-0 w-full flex-col gap-1.5 overflow-hidden">
      {state.offline && <OfflineBanner />}
      {renderBanner?.(ctx)}
      <RoomHeader
        room={room}
        game={game}
        isHost={isHost}
        compact={compact}
        expiryRemainingMs={expiryRemainingMs}
        onInvite={() => setOverlay("invite")}
        onLeave={() => setOverlay("leave")}
      />
      <NumberPanel
        room={room}
        game={game}
        compact={compact}
        nowMs={nowMs}
        serverOffsetMs={serverOffsetMs}
        onOpenBoard={() => setOverlay("board90")}
      />
      {isHost ? (
        <HostControls room={room} game={game} heldCount={heldCount} actions={actions} />
      ) : (
        <MeStatusLine game={game} heldCount={heldCount} myTicketCount={myTickets.length} mode={mode} />
      )}
      {game.status === "awaiting_confirm" && <ClaimCard claims={game.claims} />}
      <section
        data-testid="my-tickets-area"
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: dockHeight }}
      >
        <MyTickets
          gameId={game.id}
          game={game}
          tickets={myTickets}
          ready={state.playersReady && state.ticketsReady}
          calledNumbers={room.calledNumbers}
          mode={mode}
          onOpenTickets={openTickets}
        />
      </section>
      {/* Thanh KINH + thanh nút dưới cố định, luôn nằm trên mọi sheet (NFR-12). */}
      <div data-testid="bottom-dock" className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[480px] bg-background px-4">
        <KinhBar
          status={game.status}
          myTickets={myTickets}
          claims={game.claims}
          pending={actions.pending}
          onClaim={actions.claim}
          height={heights.kinhBar}
          sheetBottom={dockHeight}
        />
        <BottomBar
          height={heights.bottomBar}
          onSelect={(tab) => (tab === "tickets" ? openTickets() : setSoonTab(tab))}
        />
      </div>
      <ComingSoonSheet tab={soonTab} onClose={() => setSoonTab(null)} bottom={dockHeight} />
      <TicketSheet
        open={ticketsOpen}
        onOpenChange={setTicketsOpen}
        roomId={room.id}
        gameId={room.currentGameId || null}
        gameStatus={game.status}
        meUid={uid}
        isHost={isHost}
      />
      {renderExtras?.(ctx)}
    </main>
  );
}

function RoomSkeleton({ offline }: { offline: boolean }) {
  return (
    <main data-testid="room-skeleton" aria-busy="true" className="flex h-dvh w-full flex-col gap-1.5 overflow-hidden">
      <span className="sr-only">{t("game.loadingRoom")}</span>
      {offline && <OfflineBanner />}
      <div className="flex h-14 shrink-0 items-center">
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-24 w-full shrink-0 rounded-lg" />
      <Skeleton className="mx-auto h-[336px] w-full max-w-[346px] shrink-0 rounded-md" />
      <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[480px] bg-background px-4">
        <BottomBar height={LAYOUT_HEIGHTS.single.bottomBar} onSelect={() => undefined} />
      </div>
    </main>
  );
}
