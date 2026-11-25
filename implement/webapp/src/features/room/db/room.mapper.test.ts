import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { generateTicketSet, seededRng } from "@/features/room/shared/domain/generate-ticket-set";
import { newRoomDocs, roomFromDoc, toRoomCreated, type NewRoom } from "./room.mapper";

const createdAt = new Date("2026-11-21T10:00:00Z");
const expiresAt = new Date("2026-11-21T18:00:00Z");

const input: NewRoom = {
  id: "r_1",
  name: "Lô tô Tết",
  hostUid: "u_an",
  inviteCode: "4kT9xQ2LmB7vRz1NcP8sWd",
  joinCode: "K7M2QX",
  drawIntervalSec: 5,
  voicePack: "v1",
  gameId: "g_1",
  createdAt,
  expiresAt,
  tickets: generateTicketSet(seededRng(1)),
};

describe("newRoomDocs", () => {
  const docs = newRoomDocs(input);
  const expireMs = createdAt.getTime() + 31 * 86_400_000;

  it("room doc has every TBL-02 field with create defaults", () => {
    expect(docs.room).toMatchObject({
      name: "Lô tô Tết",
      host_uid: "u_an",
      created_by: "u_an",
      status: "active",
      member_count: 1,
      blocked_uids: [],
      invite_code: input.inviteCode,
      join_code: "K7M2QX",
      draw_interval_sec: 5,
      called_numbers: [],
      current_game_id: "g_1",
      game_count: 1,
      ticket_set_no: 1,
      last_event: null,
      closed_at: null,
      close_reason: null,
    });
    expect(docs.room.expires_at.toMillis()).toBe(expiresAt.getTime());
    expect(docs.room.invite_expires_at.toMillis()).toBe(expiresAt.getTime());
    expect(docs.room.expire_at.toMillis()).toBe(expireMs);
  });

  it("game 1 is waiting with empty claims/winners and null optional fields", () => {
    expect(docs.game).toMatchObject({
      seq_no: 1,
      status: "waiting",
      claims: [],
      winners: [],
      resume_status: null,
      player_count: 0,
      pause_reason: null,
      next_call_at: null,
      result: null,
      started_at: null,
      ended_at: null,
      confirmed_by: null,
    });
    expect(docs.game.expire_at.toMillis()).toBe(expireMs);
  });

  it("16 tickets with set_no 1 and expire_at", () => {
    expect(docs.tickets.map((t) => t.id)).toEqual(input.tickets.map((t) => t.id));
    for (const t of docs.tickets) {
      expect(t.doc.set_no).toBe(1);
      expect(t.doc.grid).toHaveLength(81);
      expect(t.doc.expire_at.toMillis()).toBe(expireMs);
    }
  });

  it("maps to RoomRecord and RoomCreated", () => {
    const record = roomFromDoc("r_1", docs.room);
    expect(record).toMatchObject({ id: "r_1", status: "active", joinCode: "K7M2QX", currentGameId: "g_1" });
    expect(record.expiresAt.getTime()).toBe(expiresAt.getTime());
    expect(toRoomCreated(input, "http://localhost:3000/join/x")).toEqual({
      roomId: "r_1",
      name: "Lô tô Tết",
      inviteCode: input.inviteCode,
      roomCode: "K7M2QX",
      inviteUrl: "http://localhost:3000/join/x",
      currentGameId: "g_1",
      drawIntervalSec: 5,
      voicePack: "v1",
      expiresAt: "2026-11-21T18:00:00.000Z",
    });
  });

  it("roomFromDoc maps blockedUids and inviteExpiresAt, with safe defaults", () => {
    const record = roomFromDoc("r_1", { ...docs.room, blocked_uids: ["u_x"] });
    expect(record.blockedUids).toEqual(["u_x"]);
    expect(record.inviteExpiresAt.getTime()).toBe(expiresAt.getTime());
    const legacy = roomFromDoc("r_1", { ...docs.room, blocked_uids: undefined, invite_expires_at: undefined } as never);
    expect(legacy.blockedUids).toEqual([]);
    expect(legacy.inviteExpiresAt.getTime()).toBe(expiresAt.getTime());
  });

  it("roomFromDoc normalizes missing close_reason", () => {
    const doc = { ...docs.room, close_reason: undefined, created_at: Timestamp.fromDate(createdAt) };
    expect(roomFromDoc("r_1", doc as never).closeReason).toBeNull();
  });
});
