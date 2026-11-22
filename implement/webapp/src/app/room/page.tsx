import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { AuthSync } from "@/features/auth/client";
import { requireUser } from "@/features/auth/server/queries/current-user.query";
import { RoomScreen } from "@/features/game/client";

// SCR-04 Phòng chơi (T-006).
export default function RoomPage() {
  return (
    <Suspense fallback={<RoomFallback />}>
      <Room />
    </Suspense>
  );
}

async function Room() {
  const me = await requireUser();
  if (!me.currentRoomId) redirect("/");
  return (
    <>
      <RoomScreen uid={me.uid} roomId={me.currentRoomId} />
      <AuthSync />
    </>
  );
}

function RoomFallback() {
  return (
    <div data-testid="room-skeleton" aria-busy="true" className="flex flex-col gap-4 py-6">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
