// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeGame, makeTicket } from "@/features/game/client/test-fixtures";
import { ResultOverlay } from "./result-overlay";

const blue = makeTicket("blue_a", 0);
const won = makeGame("finished", {
  seqNo: 3,
  result: "won",
  winners: [
    { uid: "u_c", displayName: "Cúc", ticketId: "blue_a", color: "blue", row: 0, claimedAtMs: 1 },
    { uid: "u_b", displayName: "Bình", ticketId: "red_a", color: "red", row: 1, claimedAtMs: 2 },
  ],
});

describe("ResultOverlay", () => {
  afterEach(cleanup);

  it("AC-11: congrats, summary, winners, mini ticket, keep line, confetti hidden under reduced motion; Đóng closes", async () => {
    const onClose = vi.fn();
    render(<ResultOverlay game={won} tickets={[blue]} calledNumbers={[]} ticketLine="kept" nextSeqNo={4} onClose={onClose} />);
    const overlay = screen.getByTestId("result-overlay");
    expect(overlay).toHaveAttribute("data-result", "won");
    expect(overlay).toHaveTextContent("🎊 Chúc mừng! 🎊");
    expect(overlay).toHaveTextContent("Ván 3 kết thúc · 2 người thắng");
    expect(screen.getByTestId("result-winner-u_c-blue_a")).toHaveTextContent("Cúc · vé Lam A");
    expect(screen.getByTestId("mini-ticket")).toHaveAttribute("data-row-win", "0");
    expect(screen.getByTestId("result-keep-line")).toHaveTextContent("Vé của bạn vẫn được giữ cho ván 4");
    expect(screen.getByTestId("confetti").className).toContain("motion-reduce:hidden");
    await userEvent.click(screen.getByTestId("btn-result-close"));
    expect(onClose).toHaveBeenCalled();
  });

  it("AC-12/AC-13: no winner title, no confetti; released line", () => {
    const g = makeGame("finished", { seqNo: 2, result: "no_winner" });
    render(<ResultOverlay game={g} tickets={[]} calledNumbers={[]} ticketLine="released" nextSeqNo={3} onClose={vi.fn()} />);
    expect(screen.getByTestId("result-overlay")).toHaveTextContent("Ván 2 kết thúc — không ai thắng");
    expect(screen.queryByTestId("confetti")).not.toBeInTheDocument();
    expect(screen.getByTestId("result-keep-line")).toHaveTextContent("vé đã được trả lại");
  });
});
