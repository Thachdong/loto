import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClock, setClock } from "@/core/server/clock";
import { updateRoomAction } from "@/features/room/server/actions/update-room.action";
import { createCookieStore } from "../auth/google-token";
import { NOW, patchRoom, ROOM, roomDoc } from "../game/game-fixtures";
import { createCast, resetAll, signInAs, writePlayer, writeTicketRoom, type Cast } from "../ticket/ticket-fixtures";

const store = vi.hoisted(() => ({ current: null as ReturnType<typeof createCookieStore> | null }));
vi.mock("next/headers", () => ({ cookies: async () => store.current }));
vi.mock("next/server", () => ({ connection: async () => undefined }));

const cookieStore = createCookieStore();
store.current = cookieStore;

let cast: Cast;
const update = (voicePack: unknown) => updateRoomAction({ roomId: ROOM, voicePack } as never);

beforeEach(async () => {
  await resetAll();
  cookieStore.reset();
  vi.spyOn(console, "info").mockImplementation(() => undefined);
  setClock(() => NOW);
  cast = await createCast();
  await writeTicketRoom(cast.H);
  await writePlayer(cast.B.uid, "Bình B", ["red_a"]);
  await patchRoom({ draw_interval_sec: 5, called_numbers: [5, 6, 7] });
});

afterEach(() => {
  resetClock();
  vi.restoreAllMocks();
});

describe("updateRoomAction (voicePack — nhịp quay 5/10/15 đã bỏ)", () => {
  it("host chọn bộ hiện tại → 200, không ghi; drawIntervalSec không còn nhận → VALIDATION_FAILED", async () => {
    await patchRoom({ last_event: null });
    signInAs(cookieStore, cast.H);
    expect(await update("v1")).toEqual({ ok: true, data: { roomId: ROOM, voicePack: "v1" } });
    // Phòng cũ chưa có field → mặc định v1 = giá trị chọn → không ghi.
    expect((await roomDoc())?.voice_pack).toBeUndefined();
    expect((await roomDoc())?.last_event).toBeNull();
    expect(await updateRoomAction({ roomId: ROOM, drawIntervalSec: 10 } as never)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });

  it("bộ lạ / thiếu → VALIDATION_FAILED", async () => {
    signInAs(cookieStore, cast.H);
    expect(await update("v9")).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(await updateRoomAction({ roomId: ROOM } as never)).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
  });

  it("AC-8: player → NOT_ROOM_HOST; outsider → NOT_ROOM_MEMBER; no session → UNAUTHENTICATED", async () => {
    expect(await update("v1")).toMatchObject({ ok: false, error: { code: "UNAUTHENTICATED" } });
    signInAs(cookieStore, cast.B);
    expect(await update("v1")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_HOST" } });
    signInAs(cookieStore, cast.X);
    expect(await update("v1")).toMatchObject({ ok: false, error: { code: "NOT_ROOM_MEMBER" } });
  });
});
