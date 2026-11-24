import { describe, expect, it, vi } from "vitest";
import { memberErrorMessage } from "./use-member-actions";

vi.mock("@/features/room/server/actions/kick-player.action", () => ({ kickPlayerAction: vi.fn() }));
vi.mock("@/features/ticket/server/actions/reclaim-player-tickets.action", () => ({ reclaimPlayerTicketsAction: vi.fn() }));

const err = (code: string) => ({ code, message: "" }) as never;

describe("memberErrorMessage (SCR-07 §3)", () => {
  it("maps codes to toasts", () => {
    expect(memberErrorMessage("kick", err("PLAYER_NOT_FOUND"), "Dũng")).toBe("Chỉ kick được người đã lấy vé");
    expect(memberErrorMessage("reclaim", err("TARGET_ONLINE"), "Chi")).toBe("Chi đang online, không thu hồi được");
    expect(memberErrorMessage("reclaim", err("GAME_NOT_WAITING"), "Chi")).toBe("Chỉ thu hồi khi ván chờ bắt đầu");
    expect(memberErrorMessage("kick", err("NOT_ROOM_HOST"), "Chi")).toBeNull();
    expect(memberErrorMessage("reclaim", err("PLAYER_NOT_FOUND"), "Chi")).toBeNull();
    expect(memberErrorMessage("kick", err("INTERNAL_ERROR"), "Chi")).toBe("Có lỗi, thử lại");
  });
});
