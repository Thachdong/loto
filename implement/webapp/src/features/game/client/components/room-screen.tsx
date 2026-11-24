"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { cancelPresence, usePresence } from "@/core/client/hooks/use-presence";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { writeLeaveReason } from "@/features/room/client";
import { HistorySheet } from "@/features/history/client";
import { MembersSheet } from "@/features/members/client";
import { ChatSheet, useChatMessages, useChatUnread } from "@/features/chat/client";
import { SettingsSheet } from "@/features/settings/client";
import { TicketSheet } from "@/features/ticket/client";
import { useGameActions } from "@/features/game/client/hooks/use-game-actions";
import { useGameRoom } from "@/features/game/client/hooks/use-game-room";
import { useFinishedGame } from "@/features/game/client/hooks/use-finished-game";
import { useHostOnline } from "@/features/game/client/hooks/use-host-online";
import { useDebugConnection, useConnection } from "@/features/game/client/hooks/use-connection";
import { useNow } from "@/features/game/client/hooks/use-now";
import { setPlayMode, usePlayMode } from "@/features/game/client/hooks/use-play-mode";
import { useSoundOn } from "@/features/game/client/hooks/use-sound-on";
import { getAudioEngine } from "@/features/game/client/lib/audio-singleton";
import { markSoundUnlocked, setSoundOn } from "@/features/game/client/lib/sound-pref";
import { syncTicketMarks } from "@/features/game/client/hooks/use-marks";
import { toast } from "sonner";
import { useServerTimeOffset } from "@/features/game/client/hooks/use-server-time-offset";
import { LAYOUT_HEIGHTS } from "@/features/game/shared/domain/ticket-layout";
import type { GameView, LeaveReasonRecord, RoomView } from "@/features/room/shared/types";
import type { PlayerView, TicketView } from "@/features/ticket/shared/types";
import { BottomBar, ComingSoonSheet, type BottomTab } from "./bottom-bar";
import { ConnectionBanner } from "./connection-banner";
import { HostControls, MeStatusLine } from "./host-controls";
import { isKinhVisible, KinhBar } from "./kinh-bar";
import { MyTickets } from "./my-tickets";
import { ResultOverlay } from "./result-overlay";
import { ReviewCard } from "./review-card";
import { NumberPanel } from "./number-panel";
import { RoomExtras } from "./room-extras";
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
  /** `serverTime − localTime` (ms); mặc định đo từ RTDB `.info/serverTimeOffset` (`useServerTimeOffset`). */
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
export function RoomScreen({ uid, roomId, serverOffsetMs: serverOffsetOverride, renderExtras, renderBanner }: Props) {
  const router = useRouter();
  /** Ý định rời của chính mình (player): lý do `left` thắng lý do suy ra từ snapshot khi `current_room_id` → null. */
  const leaveIntent = useRef<LeaveReasonRecord | null>(null);
  const state = useGameRoom({
    uid,
    initialRoomId: roomId,
    onLeave: () => {
      if (leaveIntent.current) writeLeaveReason(leaveIntent.current);
      router.replace("/");
    },
  });
  const measuredOffsetMs = useServerTimeOffset();
  const serverOffsetMs = serverOffsetOverride ?? measuredOffsetMs;
  const [leaving, setLeaving] = useState(false);
  const connectionLost = useConnection(state.offline);
  useDebugConnection();
  const { room, game, user, players, me, myTickets } = state;
  const [ticketsOpen, setTicketsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overlay, setOverlay] = useState<RoomOverlay | null>(null);
  const [soonTab, setSoonTab] = useState<Exclude<BottomTab, "tickets"> | null>(null);
  const mode = usePlayMode();
  const soundOn = useSoundOn();
  const nowMs = useNow(room !== null);

  // ADR-06: ghi presence khi đã biết user; ngừng ghi khi đang rời phòng.
  usePresence(user && !leaving ? roomId : null, user && !leaving ? { uid, displayName: user.displayName, photoUrl: user.photoUrl } : null);

  const actions = useGameActions(roomId, game?.id ?? "");
  const finished = useFinishedGame({ roomId, uid, current: game, currentPlayers: players, playersReady: state.playersReady });
  const awaiting = game?.status === "awaiting_confirm";
  const chat = useChatMessages(room ? roomId : null);
  const chatUnread = useChatUnread(roomId, uid, chat.messages, chatOpen);
  const hostOnline = useHostOnline(roomId, room?.hostUid ?? null, awaiting && room?.hostUid !== uid);

  if (!room || !game) {
    return <RoomSkeleton offline={connectionLost} />;
  }

  const isHost = room.hostUid === uid;
  const compact = myTickets.length >= 2;
  const heights = compact ? LAYOUT_HEIGHTS.double : LAYOUT_HEIGHTS.single;
  const dockHeight = heights.bottomBar + (isKinhVisible(game.status, myTickets.length) ? heights.kinhBar : 0);
  const heldCount = players.reduce((sum, p) => sum + p.ticketIds.length, 0);
  const holderCount = players.filter((p) => p.ticketIds.length > 0).length;
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
  const startLeave = async () => {
    leaveIntent.current = isHost ? null : { reason: "left", roomName: room.name };
    setLeaving(true);
    await cancelPresence(roomId, uid);
  };
  const abortLeave = () => {
    leaveIntent.current = null;
    setLeaving(false);
  };
  const changeSound = (on: boolean) => {
    if (on) {
      // Chạm bật tiếng cũng là thao tác người dùng → mở khóa audio luôn (SCR-11.A2).
      markSoundUnlocked();
      void getAudioEngine().unlock().catch(() => undefined);
    }
    setSoundOn(on);
  };
  const changeMode = (next: "manual" | "auto") => {
    // Tắt Tự dò: giữ nguyên các ô Auto đã tô (= số đã gọi có trên vé) thành dấu tay (Q-068).
    if (mode === "auto" && next === "manual" && game.status !== "waiting") syncTicketMarks(game.id, myTickets, room.calledNumbers);
    setPlayMode(next);
  };
  const expiryRemainingMs = room.expiresAt.getTime() - (nowMs + serverOffsetMs);

  return (
    <main data-testid="room-screen" className="flex h-dvh min-h-0 w-full flex-col gap-1.5 overflow-hidden">
      {connectionLost && <ConnectionBanner />}
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
        <HostControls room={room} game={game} heldCount={heldCount} holderCount={holderCount} actions={actions} />
      ) : (
        <MeStatusLine game={game} heldCount={heldCount} myTicketCount={myTickets.length} mode={mode} />
      )}
      {awaiting && (
        <ReviewCard
          claims={game.claims}
          tickets={state.tickets}
          calledNumbers={room.calledNumbers}
          isHost={isHost}
          hostOnline={hostOnline}
          myTicketIds={me?.ticketIds ?? []}
          pending={actions.pending}
          onConfirm={() => void actions.confirm()}
          onReject={() => void actions.reject()}
        />
      )}
      <section
        data-testid="my-tickets-area"
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ paddingBottom: dockHeight }}
      >
        <MyTickets
          roomId={room.id}
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
          soundOn={soundOn}
          onToggleSound={() => changeSound(!soundOn)}
          mode={mode}
          onToggleAuto={() => changeMode(mode === "auto" ? "manual" : "auto")}
          canCheck={game.status !== "waiting" && room.calledNumbers.length > 0}
          onCheck={() => {
            syncTicketMarks(game.id, myTickets, room.calledNumbers);
            toast.success(t("kinh.checkDone"), { duration: 2000 });
          }}
        />
        <BottomBar
          height={heights.bottomBar}
          chatUnread={chatUnread}
          onSelect={(tab) =>
            tab === "tickets"
              ? openTickets()
              : tab === "history"
                ? setHistoryOpen(true)
                : tab === "members"
                  ? setMembersOpen(true)
                  : tab === "chat"
                    ? setChatOpen(true)
                    : tab === "settings"
                      ? setSettingsOpen(true)
                      : setSoonTab(tab)
          }
        />
      </div>
      <HistorySheet roomId={room.id} open={historyOpen} onClose={() => setHistoryOpen(false)} bottom={dockHeight} />
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        bottom={dockHeight}
        roomId={room.id}
        isHost={isHost}
        drawIntervalSec={room.drawIntervalSec}
        expiresAt={room.expiresAt}
        mode={mode}
        onModeChange={changeMode}
        soundOn={soundOn}
        onSoundChange={changeSound}
      />
      <ChatSheet roomId={room.id} uid={uid} open={chatOpen} onClose={() => setChatOpen(false)} bottom={dockHeight} chat={chat} />
      <MembersSheet
        roomId={room.id}
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        bottom={dockHeight}
        uid={uid}
        hostUid={room.hostUid}
        memberCount={room.memberCount}
        gameStatus={game.status}
        players={players}
        nowMs={nowMs + serverOffsetMs}
      />
      <ComingSoonSheet tab={soonTab} onClose={() => setSoonTab(null)} bottom={dockHeight} />
      <TicketSheet
        open={ticketsOpen}
        onOpenChange={setTicketsOpen}
        roomId={room.id}
        gameId={room.currentGameId || null}
        gameStatus={game.status}
        meUid={uid}
        isHost={isHost}
        bottom={dockHeight}
      />
      <RoomExtras ctx={ctx} dockHeight={dockHeight} onLeaveStart={startLeave} onLeaveAbort={abortLeave} onLeft={() => router.replace("/")} />
      {finished.game && (
        <ResultOverlay
          game={finished.game}
          tickets={state.tickets}
          calledNumbers={room.calledNumbers}
          ticketLine={finished.ticketLine}
          nextSeqNo={finished.nextSeqNo}
          onClose={finished.dismiss}
        />
      )}
      {renderExtras?.(ctx)}
    </main>
  );
}

function RoomSkeleton({ offline }: { offline: boolean }) {
  return (
    <main data-testid="room-skeleton" aria-busy="true" className="flex h-dvh w-full flex-col gap-1.5 overflow-hidden">
      <span className="sr-only">{t("game.loadingRoom")}</span>
      {offline && <ConnectionBanner />}
      <div className="flex h-14 shrink-0 items-center">
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-24 w-full shrink-0 rounded-lg" />
      <Skeleton className="mx-auto h-[484px] w-full max-w-[256px] shrink-0 rounded-md" />
      <div className="fixed inset-x-0 bottom-0 z-[60] mx-auto w-full max-w-[480px] bg-background px-4">
        <BottomBar height={LAYOUT_HEIGHTS.single.bottomBar} onSelect={() => undefined} />
      </div>
    </main>
  );
}
