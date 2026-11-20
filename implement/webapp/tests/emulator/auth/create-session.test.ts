import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { getAdminApp } from "@/core/server/firebase-admin";
import { createSessionAction } from "@/features/auth/server/actions/create-session.action";
import { PROJECT_ID } from "../helpers";
import {
  anonymousIdToken,
  clearFirestoreAndAuth,
  createCookieStore,
  googleIdToken,
  passwordIdToken,
} from "./google-token";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
// connection() chỉ chạy trong request Next — no-op trong test.
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

// App của server khởi tạo trước để `getApps()[0]` luôn là app mặc định của code server.
getAdminApp();
const app = getApps().find((a) => a.name === "auth-test") ?? initializeApp({ projectId: PROJECT_ID }, "auth-test");
const db = getFirestore(app);
const auth = getAuth(app);

const userDoc = async (uid: string) => (await db.doc(`users/${uid}`).get()).data();

beforeEach(async () => {
  await clearFirestoreAndAuth();
  cookieStore.reset();
  resetClock();
});

afterEach(() => {
  resetClock();
});

describe("createSessionAction", () => {
  it("AC-2: new Google user → users doc with all TBL-01 fields, isNewUser, __session cookie", async () => {
    const { idToken, localId } = await googleIdToken({
      email: "an@example.com",
      name: "An Nguyễn",
      photoUrl: "https://example.com/an.png",
    });

    const result = await createSessionAction({ idToken });

    expect(result).toEqual({
      ok: true,
      data: {
        isNewUser: true,
        me: {
          uid: localId,
          email: "an@example.com",
          displayName: "An Nguyễn",
          photoUrl: "https://example.com/an.png",
          googleName: "An Nguyễn",
          googlePhotoUrl: "https://example.com/an.png",
          profileCustomized: false,
          currentRoomId: null,
        },
      },
    });

    const doc = await userDoc(localId);
    expect(doc).toMatchObject({
      email: "an@example.com",
      google_name: "An Nguyễn",
      google_photo_url: "https://example.com/an.png",
      display_name: "An Nguyễn",
      photo_url: "https://example.com/an.png",
      profile_customized: false,
      current_room_id: null,
      chat_recent_at: [],
    });
    expect(doc?.created_at).toBeInstanceOf(Timestamp);
    expect(doc?.last_active_at).toBeInstanceOf(Timestamp);
    expect(doc?.updated_at).toBeInstanceOf(Timestamp);
    expect(Object.keys(doc ?? {}).sort()).toEqual(
      [
        "chat_recent_at",
        "created_at",
        "current_room_id",
        "display_name",
        "email",
        "google_name",
        "google_photo_url",
        "last_active_at",
        "photo_url",
        "profile_customized",
        "updated_at",
      ].sort(),
    );

    expect(cookieStore.sets).toHaveLength(1);
    const [set] = cookieStore.sets;
    expect(set.name).toBe("__session");
    expect(set.value).toBeTruthy();
    expect(set.value).not.toBe(idToken);
    expect(set.options).toMatchObject({ httpOnly: true, maxAge: 1209600, sameSite: "lax", path: "/" });
    expect(set.options?.secure).toBe(false);

    // Cookie là session cookie hợp lệ của đúng user.
    const decoded = await auth.verifySessionCookie(set.value, true);
    expect(decoded.uid).toBe(localId);
  });

  it("AC-4: existing user, profile_customized=false → name synced, created_at kept, last_active_at newer", async () => {
    const first = await googleIdToken({ email: "an@example.com", name: "An Nguyễn", sub: "g-an" });
    const r1 = await createSessionAction({ idToken: first.idToken });
    expect(r1.ok).toBe(true);
    const before = await userDoc(first.localId);

    // Lần đăng nhập sau (1 phút sau theo giờ server), tên Google đã đổi.
    const later = Date.now() + 60_000;
    setClock(() => new Date(later));
    await auth.updateUser(first.localId, { displayName: "An N." });
    const second = await googleIdToken({ email: "an@example.com", name: "An N.", sub: "g-an" });
    expect(second.localId).toBe(first.localId);

    const r2 = await createSessionAction({ idToken: second.idToken });
    expect(r2.ok && r2.data.isNewUser).toBe(false);
    expect(r2.ok && r2.data.me.displayName).toBe("An N.");

    const after = await userDoc(first.localId);
    expect(after?.google_name).toBe("An N.");
    expect(after?.display_name).toBe("An N.");
    expect((after?.created_at as Timestamp).isEqual(before?.created_at as Timestamp)).toBe(true);
    expect((after?.last_active_at as Timestamp).toMillis()).toBeGreaterThan(
      (before?.last_active_at as Timestamp).toMillis(),
    );
  });

  it("AC-5: profile_customized=true → display_name kept, google_name updated", async () => {
    const { idToken, localId } = await googleIdToken({ email: "binh@example.com", name: "Bình Trần Mới" });
    const created = Timestamp.fromMillis(Date.now() - 86_400_000);
    await db.doc(`users/${localId}`).set({
      email: "binh@example.com",
      google_name: "Bình Trần",
      google_photo_url: null,
      display_name: "Bình lô tô",
      photo_url: "https://example.com/custom.png",
      profile_customized: true,
      current_room_id: null,
      chat_recent_at: [],
      last_active_at: created,
      created_at: created,
      updated_at: created,
    });

    const result = await createSessionAction({ idToken });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.isNewUser).toBe(false);
    expect(result.data.me.displayName).toBe("Bình lô tô");
    expect(result.data.me.googleName).toBe("Bình Trần Mới");

    const doc = await userDoc(localId);
    expect(doc?.display_name).toBe("Bình lô tô");
    expect(doc?.photo_url).toBe("https://example.com/custom.png");
    expect(doc?.google_name).toBe("Bình Trần Mới");
    expect(doc?.profile_customized).toBe(true);
  });

  it("AC-11: garbage token → GOOGLE_TOKEN_INVALID, no doc, no cookie", async () => {
    const result = await createSessionAction({ idToken: "not-a-real-token" });

    expect(result).toMatchObject({ ok: false, error: { code: "GOOGLE_TOKEN_INVALID" } });
    expect(await db.collection("users").get()).toHaveProperty("size", 0);
    expect(cookieStore.sets).toHaveLength(0);
  });

  it("AC-11: revoked/deleted user token → GOOGLE_TOKEN_INVALID", async () => {
    const { idToken, localId } = await googleIdToken({ email: "del@example.com", name: "Del" });
    await auth.deleteUser(localId);

    const result = await createSessionAction({ idToken });

    expect(result).toMatchObject({ ok: false, error: { code: "GOOGLE_TOKEN_INVALID" } });
    expect(await userDoc(localId)).toBeUndefined();
    expect(cookieStore.sets).toHaveLength(0);
  });

  it("AC-12: anonymous provider → GOOGLE_TOKEN_INVALID, no doc", async () => {
    const { idToken, localId } = await anonymousIdToken();

    const result = await createSessionAction({ idToken });

    expect(result).toMatchObject({ ok: false, error: { code: "GOOGLE_TOKEN_INVALID" } });
    expect(await userDoc(localId)).toBeUndefined();
    expect(cookieStore.sets).toHaveLength(0);
  });

  it("AC-12: password provider → GOOGLE_TOKEN_INVALID, no doc", async () => {
    const { idToken, localId } = await passwordIdToken("pw@example.com");

    const result = await createSessionAction({ idToken });

    expect(result).toMatchObject({ ok: false, error: { code: "GOOGLE_TOKEN_INVALID" } });
    expect(await userDoc(localId)).toBeUndefined();
    expect(cookieStore.sets).toHaveLength(0);
  });

  it("AC-13: empty idToken → VALIDATION_FAILED", async () => {
    const result = await createSessionAction({ idToken: "" });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(cookieStore.sets).toHaveLength(0);
  });

  it("AC-13: extra field → VALIDATION_FAILED", async () => {
    const { idToken } = await googleIdToken({ email: "an@example.com", name: "An Nguyễn" });
    const result = await createSessionAction({ idToken, extra: 1 });
    expect(result).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(await db.collection("users").get()).toHaveProperty("size", 0);
  });

  it("auth_time older than 5 minutes → GOOGLE_TOKEN_INVALID, no doc, no cookie", async () => {
    const { idToken, localId } = await googleIdToken({ email: "an@example.com", name: "An Nguyễn" });
    const future = Date.now() + 6 * 60_000;
    setClock(() => new Date(future));

    const result = await createSessionAction({ idToken });

    expect(result).toMatchObject({ ok: false, error: { code: "GOOGLE_TOKEN_INVALID" } });
    expect(await userDoc(localId)).toBeUndefined();
    expect(cookieStore.sets).toHaveLength(0);
  });
});
