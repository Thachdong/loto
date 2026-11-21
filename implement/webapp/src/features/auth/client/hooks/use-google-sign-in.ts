"use client";

import "client-only";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  getRedirectResult,
  signInWithPopup,
  signInWithRedirect,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/core/client/firebase";
import { createSessionAction } from "@/features/auth/server/actions/create-session.action";
import { postLoginPath } from "@/features/auth/shared/domain/post-login-path";

export type GoogleSignInState = "idle" | "loading" | "error";

/**
 * Đăng nhập Google (SCR-01.A1, ADR-07): popup trên máy tính, redirect trên điện thoại.
 * Xong Firebase Auth → gửi ID token cho `createSessionAction` → điều hướng theo `postLoginPath`.
 * Giữ phiên Firebase Auth phía client (persistence mặc định) — không signOut.
 */
export function useGoogleSignIn({ mobile, returnTo }: { mobile: boolean; returnTo: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<GoogleSignInState>(mobile ? "loading" : "idle");
  const mounted = useRef(true);
  const redirectChecked = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fail = useCallback(() => {
    if (mounted.current) setState("error");
  }, []);

  const complete = useCallback(
    async (user: User) => {
      const idToken = await user.getIdToken();
      const result = await createSessionAction({ idToken });
      if (!result.ok) {
        fail();
        return;
      }
      // Giữ trạng thái loading tới khi chuyển trang.
      router.replace(postLoginPath({ returnTo, currentRoomId: result.data.me.currentRoomId }));
    },
    [fail, returnTo, router],
  );

  // Điện thoại: xử lý kết quả khi Google redirect quay về.
  useEffect(() => {
    if (!mobile || redirectChecked.current) return;
    redirectChecked.current = true;
    (async () => {
      try {
        const credential = await getRedirectResult(getClientAuth());
        if (credential?.user) {
          await complete(credential.user);
        } else if (mounted.current) {
          setState("idle");
        }
      } catch {
        fail();
      }
    })();
  }, [mobile, complete, fail]);

  const signIn = useCallback(async () => {
    setState("loading");
    try {
      const auth = getClientAuth();
      const provider = new GoogleAuthProvider();
      if (mobile) {
        await signInWithRedirect(auth, provider);
        return; // trang sẽ chuyển sang Google
      }
      const credential = await signInWithPopup(auth, provider);
      await complete(credential.user);
    } catch {
      // auth/popup-closed-by-user, auth/cancelled-popup-request, lỗi Google, lỗi mạng…
      fail();
    }
  }, [mobile, complete, fail]);

  return { state, signIn };
}
