// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import type { RoomView } from "@/features/room/shared/types";
import { useRoomEventToast } from "./use-room-event-toast";

const toast = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast }));

type Event = RoomView["lastEvent"];
const room = (lastEvent: Event, id = "r1"): RoomView => ({
  id,
  name: "R",
  hostUid: "h",
  status: "active",
  memberCount: 2,
  inviteCode: "x",
  joinCode: "ABC234",
  expiresAt: new Date(),
  currentGameId: "g1",
  gameCount: 1,
  drawIntervalSec: 5,
  calledNumbers: [],
  closeReason: null,
  lastEvent,
});
const ev = (type: string, atMs: number | null, over: Partial<NonNullable<Event>> = {}): Event => ({
  type,
  targetUid: null,
  text: null,
  atMs,
  ...over,
});

describe("useRoomEventToast", () => {
  beforeEach(() => toast.mockClear());

  it("no toast on first snapshot, even with an old event", () => {
    renderHook(() => useRoomEventToast(room(ev("ticket_set_renewed", 1)), "me"));
    expect(toast).not.toHaveBeenCalled();
  });

  it("no toast while room is null, and none for the first snapshot after it arrives", () => {
    const { rerender } = renderHook(({ r }) => useRoomEventToast(r, "me"), { initialProps: { r: null as RoomView | null } });
    rerender({ r: room(ev("ticket_set_renewed", 1)) });
    expect(toast).not.toHaveBeenCalled();
  });

  it("toasts when type changes to ticket_set_renewed; dedupes same atMs", () => {
    const { rerender } = renderHook(({ r }) => useRoomEventToast(r, "me"), { initialProps: { r: room(null) } });
    rerender({ r: room(ev("ticket_set_renewed", 100)) });
    expect(toast).toHaveBeenCalledWith(dict.event.ticketSetRenewed);
    rerender({ r: room(ev("ticket_set_renewed", 100)) });
    expect(toast).toHaveBeenCalledTimes(1);
    rerender({ r: room(ev("ticket_set_renewed", 200)) });
    expect(toast).toHaveBeenCalledTimes(2);
  });

  it("tickets_reclaimed: other player → name from text; me → 'của bạn'", () => {
    const { rerender } = renderHook(({ r }) => useRoomEventToast(r, "me"), { initialProps: { r: room(null) } });
    rerender({ r: room(ev("tickets_reclaimed", 1, { targetUid: "u2", text: "Bình" })) });
    expect(toast).toHaveBeenLastCalledWith("Host đã thu hồi vé của Bình");
    rerender({ r: room(ev("tickets_reclaimed", 2, { targetUid: "me", text: "Tôi" })) });
    expect(toast).toHaveBeenLastCalledWith(dict.event.ticketsReclaimedSelf);
  });

  it("ignores other event types", () => {
    const { rerender } = renderHook(({ r }) => useRoomEventToast(r, "me"), { initialProps: { r: room(null) } });
    rerender({ r: room(ev("member_joined", 5)) });
    expect(toast).not.toHaveBeenCalled();
  });
});
