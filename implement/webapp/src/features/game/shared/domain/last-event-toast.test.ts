import { describe, expect, it } from "vitest";
import { vi } from "@/core/shared/i18n/vi";
import { lastEventToast } from "./last-event-toast";

const ev = (type: string, over: { text?: string | null; targetUid?: string | null } = {}) => ({
  type,
  targetUid: over.targetUid ?? null,
  text: over.text ?? null,
  atMs: 1,
});
const me = { uid: "u_me" };

describe("lastEventToast", () => {
  it("null event → null", () => {
    expect(lastEventToast(null, me)).toBeNull();
  });

  it("uses server text for sentence-type events", () => {
    expect(lastEventToast(ev("claim_submitted", { text: "Bình KINH!" }), me)).toBe("Bình KINH!");
    expect(lastEventToast(ev("member_left", { text: "Bình đã rời phòng" }), me)).toBe("Bình đã rời phòng");
    expect(lastEventToast(ev("game_started", { text: "Ván 2 bắt đầu" }), me, { gameCount: 1 })).toBe("Ván 2 bắt đầu");
  });

  it("falls back by type when text is missing", () => {
    expect(lastEventToast(ev("game_started"), me, { gameCount: 3 })).toBe("Ván 3 bắt đầu");
    expect(lastEventToast(ev("game_finished"), me, { gameCount: 3 })).toBe("Ván 3 kết thúc");
    expect(lastEventToast(ev("game_paused"), me)).toBe(vi.toast.gamePaused);
    expect(lastEventToast(ev("game_resumed"), me)).toBe(vi.toast.gameResumed);
    expect(lastEventToast(ev("claims_rejected"), me)).toBe(vi.toast.claimsRejected);
    expect(lastEventToast(ev("room_expiring"), me)).toBe(vi.toast.expiresSoon);
    expect(lastEventToast(ev("room_closing"), me)).toBe(vi.toast.roomClosing);
    expect(lastEventToast(ev("ticket_set_renewed"), me)).toBe(vi.event.ticketSetRenewed);
  });

  it("room_closed: host_left → 'Host đã đóng phòng', otherwise generic", () => {
    expect(lastEventToast(ev("room_closed"), me, { closeReason: "host_left" })).toBe(vi.toast.hostLeft);
    expect(lastEventToast(ev("room_closed"), me, { closeReason: "expired" })).toBe(vi.toast.roomClosed);
  });

  it("tickets_reclaimed: self vs other", () => {
    expect(lastEventToast(ev("tickets_reclaimed", { targetUid: "u_me", text: "Tôi" }), me)).toBe(vi.event.ticketsReclaimedSelf);
    expect(lastEventToast(ev("tickets_reclaimed", { targetUid: "u_b", text: "Bình" }), me)).toBe("Host đã thu hồi vé của Bình");
  });

  it("member_kicked uses text as the name; missing name → null", () => {
    expect(lastEventToast(ev("member_kicked", { text: "Bình" }), me)).toBe("Bình đã bị mời ra khỏi phòng");
    expect(lastEventToast(ev("member_kicked"), me)).toBeNull();
  });

  it("needs a name but has none → null; unknown / game_cancelled → null", () => {
    expect(lastEventToast(ev("claim_submitted"), me)).toBeNull();
    expect(lastEventToast(ev("game_cancelled"), me)).toBeNull();
    expect(lastEventToast(ev("something_else"), me)).toBeNull();
  });
});
