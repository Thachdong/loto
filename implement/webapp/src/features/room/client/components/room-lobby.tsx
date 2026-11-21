"use client";

import { useRouter } from "next/navigation";
import { CopyIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/core/client/ui/button";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { useCurrentRoom } from "@/features/room/client/hooks/use-current-room";
import { OfflineBanner } from "@/features/room/client/components/offline-banner";

type Props = {
  uid: string;
  /** `current_room_id` server đọc lúc render (khác null — page đã redirect nếu null). */
  roomId: string;
};

export function inviteUrlFor(inviteCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/+$/, "")}/join/${inviteCode}`;
}

/**
 * `/room` tối thiểu (T-003; T-006 thay bằng SCR-04): tên phòng, "Ván n · trạng thái", "m người", mã phòng,
 * link mời + "Copy link" (chỉ host). `current_room_id` thành null → đã ghi lý do → về `/`.
 */
export function RoomLobby({ uid, roomId }: Props) {
  const router = useRouter();
  // `initialRoomId` = phòng server thấy → cả khi snapshot `users` đầu tiên đã là null cũng tính là vừa rời.
  const state = useCurrentRoom({ uid, initialRoomId: roomId, onLeave: () => router.replace("/") });
  const { room, game } = state;

  const isHost = room?.hostUid === uid;
  const inviteUrl = room ? inviteUrlFor(room.inviteCode) : "";

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(inviteUrl);
      toast.success(t("room.copied"));
    } catch {
      toast.error(t("room.copyFailed"));
    }
  }

  return (
    <main className="flex w-full flex-1 flex-col gap-4 py-6">
      {state.offline && <OfflineBanner />}

      {room ? (
        <>
          <section className="flex flex-col gap-1">
            <h1 data-testid="room-name" className="text-2xl font-bold break-words">
              {room.name}
            </h1>
            {game ? (
              <p data-testid="room-game-line" className="text-base text-muted-foreground">
                {t("room.gameLine", { game: room.gameCount, status: t(`gameStatus.${game.status}`) })}
              </p>
            ) : (
              <Skeleton className="h-6 w-40" />
            )}
            <p data-testid="room-members" className="text-base text-muted-foreground">
              {t("room.members", { count: room.memberCount })}
            </p>
          </section>

          <section className="flex flex-col gap-1 rounded-xl border bg-card p-4">
            <h2 className="text-sm font-medium text-muted-foreground">{t("room.roomCode")}</h2>
            <p data-testid="room-code" className="font-mono text-3xl font-bold tracking-[0.3em] select-all">
              {room.joinCode}
            </p>
          </section>

          {isHost && (
            <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <h2 className="text-sm font-medium text-muted-foreground">{t("room.inviteLink")}</h2>
              <p data-testid="room-invite-link" className="font-mono text-sm break-all select-all">
                {inviteUrl}
              </p>
              <Button
                type="button"
                data-testid="room-copy-link"
                className="h-12 w-full text-base"
                onClick={copyLink}
              >
                <CopyIcon aria-hidden="true" />
                {t("room.copyLink")}
              </Button>
            </section>
          )}
        </>
      ) : (
        <div data-testid="room-skeleton" aria-busy="true" className="flex flex-col gap-4">
          <span className="sr-only">{t("common.loading")}</span>
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
    </main>
  );
}
