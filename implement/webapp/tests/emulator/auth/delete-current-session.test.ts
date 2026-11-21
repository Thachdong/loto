import { getFirestore } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { defineAction } from "@/core/server/action";
import { getAdminApp } from "@/core/server/firebase-admin";
import { SESSION_COOKIE } from "@/core/server/session";
import { deleteCurrentSessionAction } from "@/features/auth/server/actions/delete-current-session.action";
import { attachSession, createSignedInUser } from "../room/session-cookie";
import { clearFirestoreAndAuth, createCookieStore } from "./google-token";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
// connection() chỉ chạy trong request Next — no-op trong test.
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

const db = getFirestore(getAdminApp());

const whoAmIAction = defineAction({
  name: "whoAmI",
  input: z.strictObject({}),
  auth: "required",
  handler: async ({ uid }) => ({ uid }),
});

// tokensValidAfterTime tính theo giây — chờ sang giây mới để auth_time < thời điểm thu hồi.
const nextSecond = () => new Promise((resolve) => setTimeout(resolve, 1100));

beforeEach(async () => {
  await clearFirestoreAndAuth();
  cookieStore.reset();
  vi.restoreAllMocks();
});

describe("deleteCurrentSessionAction", () => {
  it("AC-14: not in a room → data null, __session cleared (maxAge 0)", async () => {
    const user = await createSignedInUser({ email: "giang@example.com", name: "Giang" });
    attachSession(cookieStore, user);
    await nextSecond();

    const result = await deleteCurrentSessionAction({});

    expect(result).toEqual({ ok: true, data: null });
    expect(cookieStore.sets).toHaveLength(1);
    expect(cookieStore.sets[0]).toMatchObject({
      name: SESSION_COOKIE,
      value: "",
      options: { maxAge: 0, path: "/", httpOnly: true, sameSite: "lax" },
    });
    // Request sau không còn cookie → UNAUTHENTICATED.
    expect(await whoAmIAction({})).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("AC-15: an old copy of __session is revoked → UNAUTHENTICATED", async () => {
    const user = await createSignedInUser({ email: "giang@example.com", name: "Giang" });
    attachSession(cookieStore, user);
    expect((await whoAmIAction({})).ok).toBe(true);
    await nextSecond();

    expect((await deleteCurrentSessionAction({})).ok).toBe(true);

    attachSession(cookieStore, user); // dùng lại bản sao cookie cũ
    expect(await whoAmIAction({})).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
  });

  it("AC-16: in a room → INTERNAL_ERROR, nothing changes, session still valid", async () => {
    const user = await createSignedInUser({ email: "cuc@example.com", name: "Cúc", currentRoomId: "r_old" });
    await db.doc("rooms/r_old").set({ name: "Phòng của Cúc", status: "active", member_count: 1 });
    attachSession(cookieStore, user);
    const userBefore = (await db.doc(`users/${user.uid}`).get()).data();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await nextSecond();

    const result = await deleteCurrentSessionAction({});

    expect(result).toMatchObject({ ok: false, error: { code: "INTERNAL_ERROR" } });
    expect(log.mock.calls.some((c) => String(c[0]).includes("not_implemented_until_T-011"))).toBe(true);
    expect(cookieStore.sets).toHaveLength(0);
    expect((await db.doc(`users/${user.uid}`).get()).data()).toEqual(userBefore);
    expect((await db.doc("rooms/r_old").get()).data()).toEqual({
      name: "Phòng của Cúc",
      status: "active",
      member_count: 1,
    });
    expect((await whoAmIAction({})).ok).toBe(true);
  });

  it("no session → UNAUTHENTICATED", async () => {
    expect(await deleteCurrentSessionAction({})).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    expect(cookieStore.sets).toHaveLength(0);
  });

  it("unknown field → VALIDATION_FAILED", async () => {
    const user = await createSignedInUser({ email: "giang@example.com", name: "Giang" });
    attachSession(cookieStore, user);
    expect(await deleteCurrentSessionAction({ force: true })).toMatchObject({
      ok: false,
      error: { code: "VALIDATION_FAILED" },
    });
  });
});
