import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineAction } from "@/core/server/action";
import { getAdminApp } from "@/core/server/firebase-admin";
import { SESSION_COOKIE } from "@/core/server/session";
import { PROJECT_ID } from "../helpers";
import { clearFirestoreAndAuth, createCookieStore, googleIdToken } from "./google-token";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));

const cookieStore = createCookieStore();
store.current = cookieStore;

getAdminApp();
const app = getApps().find((a) => a.name === "session-test") ?? initializeApp({ projectId: PROJECT_ID }, "session-test");
const auth = getAuth(app);

const whoAmIAction = defineAction({
  name: "whoAmI",
  input: z.strictObject({}),
  auth: "required",
  handler: async ({ uid }) => ({ uid }),
});

async function validSessionCookie(): Promise<{ cookie: string; uid: string }> {
  const { idToken, localId } = await googleIdToken({ email: "an@example.com", name: "An Nguyễn" });
  const cookie = await auth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 });
  return { cookie, uid: localId };
}

beforeEach(async () => {
  await clearFirestoreAndAuth();
  cookieStore.reset();
});

describe("AC-19: defineAction auth 'required' checks the session cookie", () => {
  it("no cookie → UNAUTHENTICATED", async () => {
    const result = await whoAmIAction({});
    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("garbage cookie → UNAUTHENTICATED", async () => {
    cookieStore.jar.set(SESSION_COOKIE, "garbage.cookie.value");
    const result = await whoAmIAction({});
    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("valid session cookie → handler receives the uid", async () => {
    const { cookie, uid } = await validSessionCookie();
    cookieStore.jar.set(SESSION_COOKIE, cookie);

    const result = await whoAmIAction({});

    expect(result).toEqual({ ok: true, data: { uid } });
  });

  it("revoked session (revokeRefreshTokens) → UNAUTHENTICATED", async () => {
    const { cookie, uid } = await validSessionCookie();
    cookieStore.jar.set(SESSION_COOKIE, cookie);
    expect((await whoAmIAction({})).ok).toBe(true);

    // tokensValidAfterTime tính theo giây — chờ sang giây mới để auth_time < thời điểm thu hồi.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await auth.revokeRefreshTokens(uid);

    const result = await whoAmIAction({});
    expect(result).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });
});
