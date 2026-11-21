"use client";

import Link from "next/link";
import { Button } from "@/core/client/ui/button";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import type { GameView, RoomView } from "@/features/room/shared/types";

/** SCR-02 card 9 "Bạn đang ở phòng" — thay 6–8; nút "Về phòng" → `/room` (A2). */
export function CurrentRoomCard({ room, game }: { room: RoomView | null; game: GameView | null }) {
  return (
    <section data-testid="current-room-card" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{t("home.currentTitle")}</h2>
      {room ? (
        <>
          <p data-testid="current-room-name" className="text-lg font-semibold break-words">
            {room.name}
          </p>
          {game ? (
            <p data-testid="current-room-summary" className="text-sm text-muted-foreground">
              {t("home.currentSummary", {
                game: room.gameCount,
                status: t(`gameStatus.${game.status}`),
                members: room.memberCount,
              })}
            </p>
          ) : (
            <Skeleton className="h-5 w-48" />
          )}
        </>
      ) : (
        <>
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-48" />
        </>
      )}
      <Button asChild className="h-12 w-full text-base">
        <Link href="/room" data-testid="back-to-room-button">
          {t("home.backToRoom")}
        </Link>
      </Button>
    </section>
  );
}
