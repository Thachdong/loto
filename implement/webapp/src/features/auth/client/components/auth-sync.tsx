"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { getClientAuth } from "@/core/client/firebase";

/**
 * Server có phiên nhưng client Firebase Auth đã mất (VD xóa IndexedDB) → về `/login?reauth=1` (ADR-07, AC-20).
 * Chỉ xét lần báo trạng thái đầu tiên.
 */
export function AuthSync() {
  const router = useRouter();

  useEffect(() => {
    let first = true;
    const unsubscribe = onAuthStateChanged(getClientAuth(), (user) => {
      if (!first) return;
      first = false;
      if (!user) router.replace("/login?reauth=1");
    });
    return unsubscribe;
  }, [router]);

  return null;
}
