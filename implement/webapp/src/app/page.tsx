import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";
import { AccountHeader, AuthSync } from "@/features/auth/client";
import { requireUser } from "@/features/auth/server/queries/current-user.query";
import { HomeScreen } from "@/features/room/client";

// SCR-02 Trang chủ. Đọc phiên là dữ liệu theo request ⇒ nằm trong <Suspense> (cacheComponents).
export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const me = await requireUser();
  // Người đang ở phòng mở lại app → vào thẳng phòng (FLOW-01 bước 6, wireframe §3).
  if (me.currentRoomId) redirect("/room");
  return (
    <>
      <AccountHeader uid={me.uid} displayName={me.displayName} photoUrl={me.photoUrl} currentRoomId={me.currentRoomId} />
      <HomeScreen uid={me.uid} displayName={me.displayName} />
      <AuthSync />
    </>
  );
}

function HomeFallback() {
  return (
    <div data-testid="home-skeleton" aria-busy="true" className="flex flex-col gap-4">
      <span className="sr-only">{t("common.loading")}</span>
      <div className="flex h-14 items-center justify-between">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="size-9 rounded-full" />
      </div>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
