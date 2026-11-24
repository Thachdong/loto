// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeTicket } from "@/features/game/client/test-fixtures";
import type { ClaimView } from "@/features/room/shared/types";
import { ReviewCard } from "./review-card";
import { rowNumbersText } from "./mini-ticket";

const blue = makeTicket("blue_a", 0);
const red = makeTicket("red_a", 10);
const win: ClaimView = { uid: "u_c", displayName: "Cúc", ticketId: "blue_a", color: "blue", result: "win", row: 0, claimedAtMs: 1 };
const miss: ClaimView = { uid: "u_b", displayName: "Bình", ticketId: "red_a", color: "red", result: "miss", row: null, claimedAtMs: 2 };
const base = {
  tickets: [blue, red],
  calledNumbers: blue.grid.slice(0, 9).filter((n) => n !== 0),
  hostOnline: true,
  myTicketIds: [],
  pending: null,
  onConfirm: vi.fn(),
  onReject: vi.fn(),
};

describe("ReviewCard", () => {
  afterEach(cleanup);

  it("AC-1: title with count, ✅ Đúng row + 5 numbers / ❌ Hụt, mini ticket of the first claim with the win row outlined", () => {
    render(<ReviewCard {...base} claims={[win, miss]} isHost={false} />);
    expect(screen.getByTestId("review-card")).toHaveTextContent("KINH! · Chờ host duyệt (2 lượt)");
    expect(screen.getByTestId("review-item-u_c-blue_a")).toHaveTextContent(`✅ Đúng – Hàng 1: ${rowNumbersText(blue.grid, 0)}`);
    expect(screen.getByTestId("review-item-u_b-red_a")).toHaveTextContent("❌ Hụt");
    expect(screen.getByTestId("mini-ticket")).toHaveAttribute("data-row-win", "0");
  });

  it("'▸ Xem vé' switches the mini ticket to another claim", async () => {
    render(<ReviewCard {...base} claims={[win, miss]} isHost={false} />);
    await userEvent.click(screen.getByTestId("btn-review-view-u_b-red_a"));
    expect(screen.getByTestId("mini-ticket")).toHaveAttribute("data-row-win", "");
  });

  it("AC-3: host sees confirm with a win, reject with only misses; buttons disabled while pending", async () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ReviewCard {...base} claims={[miss, win]} isHost onConfirm={onConfirm} />);
    expect(screen.queryByTestId("btn-reject-claims")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("btn-confirm-game"));
    expect(onConfirm).toHaveBeenCalled();
    rerender(<ReviewCard {...base} claims={[miss]} isHost pending="reject" />);
    expect(screen.queryByTestId("btn-confirm-game")).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-reject-claims")).toBeDisabled();
    expect(screen.queryByTestId("review-waiting")).not.toBeInTheDocument();
  });

  it("AC-3/AC-4: player sees waiting line, nudge only with an unclaimed ticket, host-offline line", () => {
    const { rerender } = render(<ReviewCard {...base} claims={[miss]} isHost={false} myTicketIds={["red_a"]} />);
    expect(screen.getByTestId("review-waiting")).toBeInTheDocument();
    expect(screen.queryByTestId("review-nudge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("review-host-offline")).not.toBeInTheDocument();
    rerender(<ReviewCard {...base} claims={[miss]} isHost={false} myTicketIds={["red_a", "red_b"]} hostOnline={false} />);
    expect(screen.getByTestId("review-nudge")).toBeInTheDocument();
    expect(screen.getByTestId("review-host-offline")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xác nhận|Bác bỏ/ })).not.toBeInTheDocument();
  });
});
