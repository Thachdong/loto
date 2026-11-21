import { Skeleton } from "@/core/client/ui/skeleton";
import { t } from "@/core/shared/i18n/vi";

/** Khung chờ SCR-03 (Suspense fallback + `loading.tsx`): header logo + ảnh host, lời mời, nút. */
export function JoinSkeleton() {
  return (
    <div data-testid="join-skeleton" aria-busy="true" className="flex flex-col items-center gap-3 py-8">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton className="size-20 rounded-full" />
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-5 w-48" />
      <Skeleton className="mt-4 h-12 w-full rounded-md" />
    </div>
  );
}
