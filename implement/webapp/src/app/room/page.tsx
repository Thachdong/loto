import { redirect } from "next/navigation";
import { Suspense } from "react";
import { t } from "@/core/shared/i18n/vi";
import { AuthSync } from "@/features/auth/client";
import { requireUser } from "@/features/auth/server/queries/current-user.query";

// Trang phòng giữ chỗ (T-002). T-003/T-006 thay bằng SCR-04.
export default function RoomPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
      <Suspense fallback={<p className="text-muted-foreground">{t("common.loading")}</p>}>
        <RoomPlaceholder />
      </Suspense>
    </main>
  );
}

async function RoomPlaceholder() {
  const me = await requireUser();
  if (!me.currentRoomId) redirect("/");
  return (
    <>
      <h1 className="text-2xl font-bold">{t("room.title")}</h1>
      <p data-testid="room-current-id" className="text-muted-foreground">
        {t("room.currentRoom", { id: me.currentRoomId })}
      </p>
      <AuthSync />
    </>
  );
}
