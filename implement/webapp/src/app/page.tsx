import { redirect } from "next/navigation";
import { Suspense } from "react";
import { t } from "@/core/shared/i18n/vi";
import { AuthSync } from "@/features/auth/client";
import { requireUser } from "@/features/auth/server/queries/current-user.query";

// Khung tối thiểu SCR-02 (T-002). T-003 hoàn thiện trang chủ.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
      <Suspense fallback={<p className="text-muted-foreground">{t("common.loading")}</p>}>
        <Greeting />
      </Suspense>
    </main>
  );
}

async function Greeting() {
  const me = await requireUser();
  // Người đang ở phòng mở lại app → vào thẳng phòng (wireframe mục 3).
  if (me.currentRoomId) redirect("/room");
  return (
    <>
      <h1 data-testid="home-greeting" className="text-2xl font-bold">
        {t("home.greeting", { name: me.displayName })}
      </h1>
      <AuthSync />
    </>
  );
}
