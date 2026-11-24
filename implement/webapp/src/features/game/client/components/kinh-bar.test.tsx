// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { makeTicket } from "@/features/game/client/test-fixtures";
import type { ClaimView, GameStatus } from "@/features/room/shared/types";
import { KinhBar } from "./kinh-bar";

const red = makeTicket("red_a");
const blueA = makeTicket("blue_a");
const blueB = makeTicket("blue_b");
const claim = (ticketId: ClaimView["ticketId"]): ClaimView => ({
  uid: "u_me",
  displayName: "Tôi",
  ticketId,
  color: ticketId.split("_")[0] as ClaimView["color"],
  result: "miss",
  row: null,
  claimedAtMs: 1,
});

const extra = { onToggleAuto: vi.fn(), onCheck: vi.fn() };

function setup(
  over: { status?: GameStatus; tickets?: ReturnType<typeof makeTicket>[]; claims?: ClaimView[]; pending?: string | null; mode?: "manual" | "auto"; canCheck?: boolean } = {},
) {
  const onClaim = vi.fn();
  render(
    <KinhBar
      status={over.status ?? "running"}
      myTickets={over.tickets ?? [red]}
      claims={over.claims ?? []}
      pending={over.pending ?? null}
      onClaim={onClaim}
      height={56}
      sheetBottom={120}
      mode={over.mode ?? "manual"}
      canCheck={over.canCheck ?? true}
      onToggleAuto={extra.onToggleAuto}
      onCheck={extra.onCheck}
    />,
  );
  return onClaim;
}

describe("KinhBar", () => {
  afterEach(cleanup);

  it("Check, Auto and KINH sit in one row; Check syncs, Auto toggles; Check disabled in auto mode or before any call", async () => {
    setup();
    const bar = screen.getByTestId("kinh-bar");
    expect(bar.className).toContain("grid-cols-3");
    expect([...bar.querySelectorAll("button")].map((b) => b.dataset.testid)).toEqual(["btn-check", "btn-auto", "btn-kinh"]);
    await userEvent.click(screen.getByTestId("btn-check"));
    expect(extra.onCheck).toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("btn-auto"));
    expect(extra.onToggleAuto).toHaveBeenCalled();
    expect(screen.getByTestId("btn-auto")).toHaveAttribute("aria-pressed", "false");
    cleanup();
    setup({ mode: "auto" });
    expect(screen.getByTestId("btn-check")).toBeDisabled();
    expect(screen.getByTestId("btn-auto")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    setup({ canCheck: false });
    expect(screen.getByTestId("btn-check")).toBeDisabled();
  });

  it.each<GameStatus>(["waiting", "finished", "cancelled"])("hidden when the game is %s", (status) => {
    setup({ status });
    expect(screen.queryByTestId("kinh-bar")).not.toBeInTheDocument();
  });

  it("hidden for a spectator (no ticket)", () => {
    setup({ tickets: [] });
    expect(screen.queryByTestId("kinh-bar")).not.toBeInTheDocument();
  });

  it.each<GameStatus>(["running", "paused", "awaiting_confirm"])("visible and enabled when %s", (status) => {
    setup({ status });
    expect(screen.getByTestId("btn-kinh")).toHaveTextContent("KINH");
    expect(screen.getByTestId("btn-kinh")).toBeEnabled();
  });

  it("1 ticket: click claims immediately, then locks for 1 second", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const onClaim = setup();
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(screen.getByTestId("btn-kinh"));
      expect(onClaim).toHaveBeenCalledWith("red_a");
      expect(screen.getByTestId("btn-kinh")).toBeDisabled();
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId("btn-kinh")).toBeEnabled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("2 tickets: opens the action sheet with one row per ticket and claims the chosen one", async () => {
    const onClaim = setup({ tickets: [blueA, blueB] });
    await userEvent.click(screen.getByTestId("btn-kinh"));
    expect(onClaim).not.toHaveBeenCalled();
    expect(screen.getByTestId("kinh-sheet-blue_a")).toHaveTextContent("Kinh vé Lam A");
    expect(screen.getByTestId("kinh-sheet-blue_b")).toHaveTextContent("Kinh vé Lam B");
    await userEvent.click(screen.getByTestId("kinh-sheet-blue_b"));
    expect(onClaim).toHaveBeenCalledTimes(1);
    expect(onClaim).toHaveBeenCalledWith("blue_b");
  });

  it("ticket already in claims → 'Đã KINH vé này' and locked (1 ticket)", () => {
    setup({ status: "awaiting_confirm", claims: [claim("red_a")] });
    expect(screen.getByTestId("btn-kinh")).toHaveTextContent(dict.kinh.claimed);
    expect(screen.getByTestId("btn-kinh")).toBeDisabled();
  });

  it("2 tickets, one already claimed: bar stays enabled, that row is locked", async () => {
    const onClaim = setup({ status: "awaiting_confirm", tickets: [blueA, blueB], claims: [claim("blue_a")] });
    expect(screen.getByTestId("btn-kinh")).toBeEnabled();
    await userEvent.click(screen.getByTestId("btn-kinh"));
    expect(screen.getByTestId("kinh-sheet-blue_a")).toBeDisabled();
    expect(screen.getByTestId("kinh-sheet-blue_a")).toHaveTextContent(dict.kinh.claimed);
    await userEvent.click(screen.getByTestId("kinh-sheet-blue_b"));
    expect(onClaim).toHaveBeenCalledWith("blue_b");
  });

  it("2 tickets both claimed → bar locked with 'Đã KINH vé này'", () => {
    setup({ status: "awaiting_confirm", tickets: [blueA, blueB], claims: [claim("blue_a"), claim("blue_b")] });
    expect(screen.getByTestId("btn-kinh")).toBeDisabled();
    expect(screen.getByTestId("btn-kinh")).toHaveTextContent(dict.kinh.claimed);
  });

  it("while a claim is pending the button is disabled", () => {
    setup({ pending: "claim:red_a" });
    expect(screen.getByTestId("btn-kinh")).toBeDisabled();
  });
});

