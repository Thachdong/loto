"use client";

import "client-only";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getClientDatabase } from "@/core/client/firebase";

/**
 * SCR-09 #6: RTDB `presence/{roomId}/{hostUid}.online` (CHỈ ĐỌC). `null` = chưa biết (đang tải / tắt);
 * không có node → `false`.
 */
export function useHostOnline(roomId: string | null, hostUid: string | null, enabled: boolean): boolean | null {
  const [state, setState] = useState<{ key: string; online: boolean } | null>(null);
  const key = enabled && roomId && hostUid ? `${roomId}/${hostUid}` : null;

  useEffect(() => {
    if (!key) return;
    return onValue(
      ref(getClientDatabase(), `presence/${key}/online`),
      (snap) => setState({ key, online: snap.val() === true }),
      () => setState({ key, online: true }),
    );
  }, [key]);

  return key && state?.key === key ? state.online : null;
}
