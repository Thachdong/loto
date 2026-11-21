"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { useCurrentRoom } from "@/features/room/client/hooks/use-current-room";
import { CreateRoomForm } from "@/features/room/client/components/create-room-form";
import { CurrentRoomCard } from "@/features/room/client/components/current-room-card";
import { LeaveReasonBanner } from "@/features/room/client/components/leave-reason-banner";
import { OfflineBanner } from "@/features/room/client/components/offline-banner";

type Props = {
  uid: string;
  /** `display_name` server đọc lúc render — dùng tới khi listener `users` trả dữ liệu. */
  displayName: string;
};

/** SCR-02 Trang chủ (phần dưới header): banner 4, lời chào 5, form 6–7, card 8 hoặc card 9. */
export function HomeScreen({ uid, displayName }: Props) {
  // Sau `ALREADY_IN_ROOM`: nghe phòng server báo dù listener `users` chưa kịp đổi.
  const [forcedRoomId, setForcedRoomId] = useState<string | null>(null);
  const pendingToast = useRef(false);

  const state = useCurrentRoom({
    uid,
    initialRoomId: null,
    fallbackRoomId: forcedRoomId,
    onLeave: () => setForcedRoomId(null),
  });
  const { user, room, game, roomId, roomStatus } = state;
  const name = user?.displayName || displayName;
  const loading = state.userStatus === "loading";

  // Toast "Bạn đang ở phòng {tên}" — chờ listener phòng có tên (AC-8).
  useEffect(() => {
    if (!pendingToast.current) return;
    if (room) {
      pendingToast.current = false;
      toast(t("home.alreadyInRoom", { name: room.name }));
    } else if (roomStatus === "error" || roomStatus === "idle") {
      pendingToast.current = false;
      toast(t("error.ALREADY_IN_ROOM"));
    }
  }, [room, roomStatus]);

  function handleAlreadyInRoom(currentRoomId: string | null) {
    pendingToast.current = true;
    if (room && (!currentRoomId || room.id === currentRoomId)) {
      pendingToast.current = false;
      toast(t("home.alreadyInRoom", { name: room.name }));
    }
    if (currentRoomId) setForcedRoomId(currentRoomId);
    else if (!roomId) {
      pendingToast.current = false;
      toast(t("error.ALREADY_IN_ROOM"));
    }
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 pt-2 pb-8">
      {/* 4 */}
      <LeaveReasonBanner />
      {state.offline && <OfflineBanner />}

      {loading ? (
        <div data-testid="home-skeleton" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only">{t("common.loading")}</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* 5 */}
          <h1 data-testid="home-greeting" className="text-2xl font-bold break-words">
            {t("home.greeting", { name })}
          </h1>

          {roomId ? (
            // 9
            <CurrentRoomCard room={room} game={game} />
          ) : (
            <>
              <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <h2 className="text-lg font-semibold">{t("home.createTitle")}</h2>
                <CreateRoomForm displayName={name} onAlreadyInRoom={handleAlreadyInRoom} />
              </section>

              {/* 8 — T-003: chỉ gợi ý link mời; nút + dialog nhập mã ở T-004 */}
              <section data-testid="join-hint-card" className="flex flex-col gap-1 rounded-xl border bg-card p-4">
                <h2 className="text-lg font-semibold">{t("home.joinTitle")}</h2>
                <p className="text-sm text-muted-foreground">{t("home.joinHint")}</p>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
