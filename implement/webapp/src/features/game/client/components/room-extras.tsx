"use client";

import { useAudio } from "@/features/game/client/hooks/use-audio";
import { useDrawScheduler } from "@/features/game/client/hooks/use-draw-scheduler";
import { useExpiryTimer } from "@/features/game/client/hooks/use-expiry-timer";
import { useSoundOn } from "@/features/game/client/hooks/use-sound-on";
import { useRoomToasts } from "@/features/game/client/hooks/use-room-toasts";
import { useWakeLock } from "@/features/game/client/hooks/use-wake-lock";
import { Board90Sheet } from "./board90-sheet";
import { InviteSheet } from "./invite-sheet";
import { LeaveDialog, leaveVariant } from "./leave-dialog";
import type { RoomScreenContext } from "./room-screen";
import { SoundGate } from "./sound-gate";

type Props = {
  ctx: RoomScreenContext;
  /** Chiều cao thanh KINH + thanh nút dưới: sheet chừa đáy theo đây. */
  dockHeight: number;
  onLeaveStart: () => Promise<void>;
  onLeaveAbort: () => void;
  onLeft: () => void;
};

/**
 * Phần không phải bố cục của SCR-04 (đợt B): scheduler rao số, đếm ngược hết hạn, Wake Lock, tiếng rao, toast
 * `last_event`, lớp "Chạm để bật tiếng" và các sheet/dialog Mời · Bảng 90 · Rời. Mount sau khi đã có phòng + ván.
 */
export function RoomExtras({ ctx, dockHeight, onLeaveStart, onLeaveAbort, onLeft }: Props) {
  const { room, game, players, uid, isHost, myTickets, serverOffsetMs, overlay, closeOverlay } = ctx;

  const soundOn = useSoundOn();
  useDrawScheduler({ room, game, players, meUid: uid, offsetMs: serverOffsetMs });
  useExpiryTimer({ room, offsetMs: serverOffsetMs });
  useWakeLock(game.status === "running");
  useAudio({ room, soundOn });
  useRoomToasts(room, uid);

  return (
    <>
      <SoundGate />
      <Board90Sheet open={overlay === "board90"} onClose={closeOverlay} calledNumbers={room.calledNumbers} bottom={dockHeight} />
      {isHost && <InviteSheet open={overlay === "invite"} onClose={closeOverlay} room={room} bottom={dockHeight} />}
      <LeaveDialog
        open={overlay === "leave"}
        variant={leaveVariant(isHost, game.status, myTickets.length)}
        roomId={room.id}
        roomName={room.name}
        onStay={closeOverlay}
        onBeforeLeave={onLeaveStart}
        onAbort={onLeaveAbort}
        onLeft={onLeft}
      />
    </>
  );
}
