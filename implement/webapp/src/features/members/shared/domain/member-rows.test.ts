import { describe, expect, it } from "vitest";
import { buildMemberRows, sortMembers, type BuildContext, type PresenceEntry } from "./member-rows";

const NOW = Date.UTC(2026, 10, 24, 9, 0);
const p = (uid: string, displayName: string, online: boolean, minutesAgo = 0): PresenceEntry => ({
  uid,
  displayName,
  photoUrl: null,
  online,
  at: NOW - minutesAgo * 60_000,
});
const presence = [p("u_chi", "Chi", false, 7), p("u_dung", "Dũng", true), p("u_binh", "Bình", true), p("u_an", "An", true)];
const ctx = (over: Partial<BuildContext> = {}): BuildContext => ({
  hostUid: "u_an",
  myUid: "u_binh",
  gameStatus: "waiting",
  ticketsByUid: { u_binh: ["red_a"], u_chi: ["blue_b"] },
  nowMs: NOW,
  ...over,
});

describe("sortMembers", () => {
  it("host → me → online → offline, same group by name", () => {
    const rows = [
      { displayName: "Zê", isHost: false, isMe: false, online: true },
      { displayName: "Bê", isHost: false, isMe: false, online: false },
      { displayName: "An", isHost: false, isMe: false, online: true },
      { displayName: "Mình", isHost: false, isMe: true, online: false },
      { displayName: "Host", isHost: true, isMe: false, online: false },
    ];
    expect(sortMembers(rows).map((r) => r.displayName)).toEqual(["Host", "Mình", "An", "Zê", "Bê"]);
  });
});

describe("buildMemberRows", () => {
  it("AC-1: player view — order An → Bình → Dũng → Chi, offline minutes, tickets, no host buttons", () => {
    const rows = buildMemberRows(presence, ctx());
    expect(rows.map((r) => r.displayName)).toEqual(["An", "Bình", "Dũng", "Chi"]);
    expect(rows[0]).toMatchObject({ isHost: true, isMe: false });
    expect(rows[1]).toMatchObject({ isMe: true, tickets: [{ id: "red_a", color: "red", side: "a" }] });
    expect(rows[3]).toMatchObject({ online: false, offlineMinutes: 7, tickets: [{ id: "blue_b", color: "blue", side: "b" }] });
    expect(rows[2].tickets).toEqual([]);
    expect(rows.some((r) => r.canKick || r.canReclaim)).toBe(false);
  });

  it("AC-7/AC-9: host view — kick only rows with tickets (not host), reclaim only offline + waiting", () => {
    const rows = buildMemberRows(presence, ctx({ myUid: "u_an" }));
    const by = Object.fromEntries(rows.map((r) => [r.uid, r]));
    expect(by.u_an).toMatchObject({ isMe: true, isHost: true, canKick: false, canReclaim: false });
    expect(by.u_binh).toMatchObject({ canKick: true, canReclaim: false });
    expect(by.u_chi).toMatchObject({ canKick: true, canReclaim: true });
    expect(by.u_dung).toMatchObject({ canKick: false, canReclaim: false });
  });

  it("AC-11: running game — no reclaim, kick still shown", () => {
    const rows = buildMemberRows(presence, ctx({ myUid: "u_an", gameStatus: "running" }));
    expect(rows.find((r) => r.uid === "u_chi")).toMatchObject({ canKick: true, canReclaim: false });
  });

  it("initial falls back to '?', unknown `at` → offlineMinutes null", () => {
    const [row] = buildMemberRows([{ uid: "u_x", displayName: " ", photoUrl: null, online: false, at: null }], ctx());
    expect(row).toMatchObject({ initial: "?", offlineMinutes: null });
  });
});
