"use client";

import "client-only";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut as firebaseSignOut } from "firebase/auth";
import { toast } from "sonner";
import { getClientAuth } from "@/core/client/firebase";
import { t } from "@/core/shared/i18n/vi";
import { deleteCurrentSessionAction } from "@/features/auth/server/actions/delete-current-session.action";

/**
 * SCR-02.A3 Đăng xuất (nhánh không ở phòng): hủy phiên server → `signOut` Firebase Auth client → `/login`.
 * `UNAUTHENTICATED` (phiên đã mất) xử lý như thành công.
 */
export function useSignOut() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const signOut = useCallback(async () => {
    setPending(true);
    try {
      const result = await deleteCurrentSessionAction({});
      if (!result.ok && result.error.code !== "UNAUTHENTICATED") {
        toast.error(result.error.message);
        setPending(false);
        return;
      }
      try {
        await firebaseSignOut(getClientAuth());
      } catch {
        // Phiên server đã hủy — vẫn về màn đăng nhập.
      }
      router.replace("/login"); // giữ pending tới khi chuyển trang
    } catch {
      toast.error(t("error.INTERNAL_ERROR"));
      setPending(false);
    }
  }, [router]);

  return { pending, signOut };
}
