import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { sendMessageAction } from "@/features/chat/server/actions/send-message.action";
import { createCookieStore } from "../auth/google-token";
import { db, millis } from "../invite/invite-fixtures";
import { NOW, patchRoom, ROOM, userDoc } from "../game/game-fixtures";
import { createCast, resetAll, signInAs, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
let clock = NOW.getTime();
const send = (text: unknown) => sendMessageAction({ roomId: ROOM, text } as never);
const messages = async () => (await db.collection(`rooms/${ROOM}/messages`).get()).docs.map((d) => d.data());

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  clock = NOW.getTime();
  setClock(() => new Date(clock));
  cast = await createCast();
  await writeTicketRoom(cast.H);
});

afterEach(() => resetClock());

describe("sendMessageAction", () => {
  it("AC-1: member sends → trimmed doc with sender copied from users, expire_at, chat_recent_at; returns Message", async () => {
    signInAs(cookieStore, cast.B);
    const res = await send("  Chào cả nhà 😆  ");
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data).toMatchObject({ senderUid: cast.B.uid, text: "Chào cả nhà 😆", createdAt: NOW.toISOString() });
    const doc = (await db.doc(`rooms/${ROOM}/messages/${res.data.id}`).get()).data();
    const user = await userDoc(cast.B.uid);
    expect(doc).toMatchObject({ sender_uid: cast.B.uid, sender_name: user?.display_name, sender_photo_url: user?.photo_url ?? null, text: "Chào cả nhà 😆" });
    const room = (await db.doc(`rooms/${ROOM}`).get()).data();
    expect(millis(doc?.expire_at)).toBe(millis(room?.created_at) + 31 * 24 * 3600 * 1000);
    expect(user?.chat_recent_at.map(millis)).toEqual([NOW.getTime()]);
  });

  it("AC-7: 6th message within 10s → RATE_LIMITED, only 5 docs; after window → ok", async () => {
    signInAs(cookieStore, cast.B);
    for (let i = 1; i <= 5; i++) {
      clock += 1000;
      expect((await send(`m${i}`)).ok).toBe(true);
    }
    clock += 1000;
    expect(await send("m6")).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } });
    expect(await messages()).toHaveLength(5);
    clock += 5500; // mốc cũ nhất (NOW+1s) giờ đã quá 10s
    expect((await send("m6")).ok).toBe(true);
    expect((await userDoc(cast.B.uid))?.chat_recent_at).toHaveLength(5);
  });

  it("AC-4/AC-6: empty → MESSAGE_EMPTY, 501 → MESSAGE_TOO_LONG, 500 ok, number → VALIDATION_FAILED", async () => {
    signInAs(cookieStore, cast.B);
    expect(await send("   ")).toMatchObject({ ok: false, error: { code: "MESSAGE_EMPTY" } });
    expect(await send("a".repeat(501))).toMatchObject({ ok: false, error: { code: "MESSAGE_TOO_LONG" } });
    expect(await send(42)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(await messages()).toHaveLength(0);
    expect((await send("a".repeat(500))).ok).toBe(true);
  });

  it("AC-8: no session / outside room / room closed → UNAUTHENTICATED / NOT_ROOM_MEMBER", async () => {
    expect(await send("hi")).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.X);
    expect(await send("hi")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    await patchRoom({ status: "closed" });
    signInAs(cookieStore, cast.B);
    expect(await send("hi")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
    expect(await messages()).toHaveLength(0);
  });
});
