// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HistoryCard } from "@/features/history/shared/domain/history-card";
import { HistorySheet } from "./history-sheet";

const h = vi.hoisted(() => ({ state: { status: "ready", cards: [] as HistoryCard[], retry: vi.fn() } }));
vi.mock("@/features/history/client/hooks/use-game-history", () => ({ useGameHistory: () => h.state }));

const won2: HistoryCard = {
  gameId: "g2",
  seqNo: 2,
  time: { kind: "range", from: "23:10", to: "23:18" },
  outcome: "won",
  winners: [
    { uid: "u_b", displayName: "Bình B", ticketId: "red_a", color: "red", photoUrl: "https://x/b.png", initial: "B" },
    { uid: "u_c", displayName: "Cúc C", ticketId: "blue_b", color: "blue", photoUrl: null, initial: "C" },
  ],
};
const cancelled: HistoryCard = { gameId: "g4", seqNo: 4, time: { kind: "cancelled", at: "23:33" }, outcome: "cancelled", winners: [] };
const noWin: HistoryCard = { gameId: "g3", seqNo: 3, time: { kind: "range", from: "23:20", to: "23:29" }, outcome: "no_winner", winners: [] };

const open = () => render(<HistorySheet roomId="r1" open onClose={vi.fn()} bottom={0} />);

describe("HistorySheet", () => {
  afterEach(cleanup);

  it("AC-1..3: cards newest first with times, winners + ticket chips, no winner / cancelled", () => {
    h.state = { status: "ready", cards: [cancelled, noWin, won2], retry: vi.fn() };
    open();
    expect(screen.getByTestId("history-sheet")).toHaveTextContent("Lịch sử ván");
    const ids = [...document.querySelectorAll("[data-testid^='history-card-']")].map((e) => e.getAttribute("data-testid"));
    expect(ids).toEqual(["history-card-4", "history-card-3", "history-card-2"]);
    expect(screen.getByTestId("history-card-4")).toHaveTextContent("Hủy lúc 23:33");
    expect(screen.getByTestId("history-card-4")).toHaveTextContent("Đã hủy");
    expect(screen.getByTestId("history-card-3")).toHaveTextContent("Không ai thắng");
    expect(screen.getByTestId("history-card-2")).toHaveTextContent("Ván 2");
    expect(screen.getByTestId("history-card-2")).toHaveTextContent("23:10 – 23:18");
    expect(screen.getByTestId("history-winner-2-u_b")).toHaveTextContent("Bình B");
    expect(screen.getByTestId("history-winner-2-u_b")).toHaveTextContent("Vé Đỏ A");
    expect(screen.getByTestId("history-winner-2-u_c")).toHaveTextContent("C");
    expect(screen.getByTestId("history-winner-2-u_c")).toHaveTextContent("Vé Lam B");
  });

  it("AC-5 empty, loading skeleton, error with retry", async () => {
    h.state = { status: "ready", cards: [], retry: vi.fn() };
    const { unmount } = open();
    expect(screen.getByTestId("history-empty")).toHaveTextContent("Chưa có ván nào kết thúc");
    expect(screen.getByTestId("history-empty")).toHaveTextContent("Kết quả mỗi ván sẽ hiện ở đây.");
    unmount();
    h.state = { status: "loading", cards: [], retry: vi.fn() };
    const r2 = open();
    expect(screen.getByTestId("history-loading")).toBeInTheDocument();
    r2.unmount();
    const retry = vi.fn();
    h.state = { status: "error", cards: [], retry };
    open();
    expect(screen.getByTestId("history-error")).toHaveTextContent("Không tải được lịch sử");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalled();
  });
});
