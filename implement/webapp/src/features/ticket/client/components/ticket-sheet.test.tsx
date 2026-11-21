// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { TICKET_IDS } from "@/features/ticket/shared/constants";
import { TicketSheet } from "./ticket-sheet";

const h = vi.hoisted(() => ({
  collections: new Map<string, { status: string; data: unknown[] }>(),
  presence: { status: "ready", map: {} as Record<string, boolean> },
  retry: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
  take: vi.fn(),
  release: vi.fn(),
  renew: vi.fn(),
  reclaim: vi.fn(),
}));

vi.mock("@/core/client/hooks/use-collection-listener", () => ({
  useCollectionListener: (path: string | null, map: (d: Record<string, unknown>, id: string) => unknown) => {
    const entry = path ? h.collections.get(path.endsWith("/tickets") ? "tickets" : "players") : undefined;
    if (!entry) return { status: path ? "loading" : "idle", data: [], errorCode: null, retry: h.retry };
    const raw = entry.data as { id: string; doc: Record<string, unknown> }[];
    return { status: entry.status, data: raw.map((r) => map(r.doc, r.id)), errorCode: null, retry: h.retry };
  },
}));
vi.mock("@/core/client/hooks/use-presence", () => ({ useRoomPresence: () => h.presence }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/features/ticket/server/actions/take-ticket.action", () => ({ takeTicketAction: h.take }));
vi.mock("@/features/ticket/server/actions/release-ticket.action", () => ({ releaseTicketAction: h.release }));
vi.mock("@/features/ticket/server/actions/renew-ticket-set.action", () => ({ renewTicketSetAction: h.renew }));
vi.mock("@/features/ticket/server/actions/reclaim-player-tickets.action", () => ({ reclaimPlayerTicketsAction: h.reclaim }));

const grid = Array.from({ length: 81 }, (_, i) => ((i % 9) % 2 === 0 ? (i % 90) + 1 : 0));
const ticketDocs = () =>
  [...TICKET_IDS].reverse().map((id) => ({
    id,
    doc: { color: id.split("_")[0], side: id.split("_")[1], grid, set_no: 1 },
  }));
const player = (uid: string, name: string, ids: string[]) => ({
  id: uid,
  doc: { display_name: name, photo_url: null, ticket_ids: ids },
});
const setBoard = (players: ReturnType<typeof player>[] = [], status = "ready") => {
  h.collections.set("tickets", { status, data: ticketDocs() });
  h.collections.set("players", { status, data: players });
};

function ui(over: Partial<React.ComponentProps<typeof TicketSheet>> = {}) {
  return (
    <TicketSheet open onOpenChange={() => {}} roomId="r1" gameId="g1" gameStatus="waiting" meUid="me" isHost={false} {...over} />
  );
}

describe("TicketSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.collections.clear();
    h.presence = { status: "ready", map: {} };
  });
  afterEach(cleanup);

  it("loading → 16 skeleton cards, no cards", () => {
    render(ui());
    expect(screen.getByTestId("ticket-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-card-red_a")).not.toBeInTheDocument();
  });

  it("AC-21: error → 'Không tải được bộ vé' + Thử lại re-attaches listeners", async () => {
    setBoard([], "error");
    render(ui());
    expect(screen.getByTestId("ticket-load-error")).toHaveTextContent(dict.ticket.loadError);
    await userEvent.click(screen.getByTestId("ticket-retry"));
    expect(h.retry).toHaveBeenCalledTimes(2); // tickets + players
  });

  it("AC-1: 16 cards in fixed color order with counter, regardless of snapshot order", () => {
    setBoard([player("me", "Tôi", ["red_a"]), player("u2", "Bình", ["blue_b"])]);
    render(ui());
    const cards = screen.getAllByTestId(/^ticket-card-/);
    expect(cards.map((c) => c.getAttribute("data-testid"))).toEqual(TICKET_IDS.map((id) => `ticket-card-${id}`));
    expect(screen.getByTestId("ticket-counter")).toHaveTextContent("Bạn giữ 1/2 vé · 2/16 vé đã có chủ");
    expect(screen.getByTestId("ticket-holder-blue_b")).toHaveTextContent("Bình");
    expect(screen.getByTestId("ticket-holder-pink_a")).toHaveTextContent(dict.ticket.empty);
    expect(screen.getByTestId("ticket-card-red_a")).toHaveTextContent(dict.ticket.mine);
    expect(screen.queryByTestId("ticket-lock-banner")).not.toBeInTheDocument();
  });

  it("AC-9: running game → lock banner, no renew, take disabled with 'Ván đang chạy'", async () => {
    setBoard([player("me", "Tôi", ["red_a"])]);
    render(ui({ gameStatus: "running", isHost: true }));
    expect(screen.getByTestId("ticket-lock-banner")).toHaveTextContent(dict.ticket.lockedBanner);
    expect(screen.queryByTestId("ticket-renew")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("ticket-card-green_a"));
    expect(screen.getByTestId("ticket-take")).toBeDisabled();
    expect(screen.getByTestId("ticket-take")).toHaveTextContent(dict.ticket.takeRunning);
  });

  it("AC-2/AC-3: preview shows paper ticket + partner line; take keeps the sheet open", async () => {
    setBoard([player("u2", "Bình", ["red_b"])]);
    h.take.mockResolvedValue({ ok: true, data: { gameId: "g1", ticketIds: ["red_a"] } });
    render(ui());
    await userEvent.click(screen.getByTestId("ticket-card-red_a"));
    expect(screen.getByTestId("paper-ticket-red_a")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-partner-line")).toHaveTextContent("Trống · cặp với vé Đỏ B (Bình)");
    await userEvent.click(screen.getByTestId("ticket-take"));
    expect(h.take).toHaveBeenCalledWith({ roomId: "r1", ticketId: "red_a" });
    expect(screen.getByTestId("ticket-sheet")).toBeInTheDocument();
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("take is not double-submitted while pending; button shows pending label", async () => {
    setBoard();
    let resolve!: (v: unknown) => void;
    h.take.mockReturnValue(new Promise((r) => (resolve = r)));
    render(ui());
    await userEvent.click(screen.getByTestId("ticket-card-red_a"));
    const btn = screen.getByTestId("ticket-take");
    await userEvent.click(btn);
    await userEvent.click(btn);
    expect(h.take).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(dict.ticket.taking);
    await act(async () => resolve({ ok: true, data: {} }));
  });

  it("AC-5/AC-6: max / taken variants disabled", async () => {
    setBoard([player("me", "Tôi", ["red_a", "red_b"]), player("u2", "Bình", ["blue_a"])]);
    render(ui());
    await userEvent.click(screen.getByTestId("ticket-card-green_a"));
    expect(screen.getByTestId("ticket-take")).toHaveTextContent(dict.ticket.takeMax);
    expect(screen.getByTestId("ticket-take")).toBeDisabled();
    await userEvent.click(screen.getByTestId("ticket-back"));
    await userEvent.click(screen.getByTestId("ticket-card-blue_a"));
    expect(screen.getByTestId("ticket-take")).toHaveTextContent(dict.ticket.takeTaken);
  });

  it("my ticket shows Bỏ vé which calls releaseTicketAction", async () => {
    setBoard([player("me", "Tôi", ["red_a"])]);
    h.release.mockResolvedValue({ ok: true, data: { gameId: "g1", ticketIds: [] } });
    render(ui());
    await userEvent.click(screen.getByTestId("ticket-card-red_a"));
    await userEvent.click(screen.getByTestId("ticket-release"));
    expect(h.release).toHaveBeenCalledWith({ roomId: "r1", ticketId: "red_a" });
  });

  it.each([
    ["TICKET_TAKEN", dict.ticket.err.taken],
    ["TICKET_LIMIT_REACHED", dict.ticket.err.limit],
    ["GAME_NOT_WAITING", dict.ticket.err.notWaitingTake],
    ["INTERNAL_ERROR", dict.ticket.err.generic],
  ])("take error %s → toast", async (code, message) => {
    setBoard();
    h.take.mockResolvedValue({ ok: false, error: { code, message: "x" } });
    render(ui());
    await userEvent.click(screen.getByTestId("ticket-card-red_a"));
    await userEvent.click(screen.getByTestId("ticket-take"));
    await waitFor(() => expect(h.toast.error).toHaveBeenCalledWith(message));
  });

  it("TICKET_NOT_HELD → no toast", async () => {
    setBoard([player("me", "Tôi", ["red_a"])]);
    h.release.mockResolvedValue({ ok: false, error: { code: "TICKET_NOT_HELD", message: "x" } });
    render(ui());
    await userEvent.click(screen.getByTestId("ticket-card-red_a"));
    await userEvent.click(screen.getByTestId("ticket-release"));
    await waitFor(() => expect(h.release).toHaveBeenCalled());
    expect(h.toast.error).not.toHaveBeenCalled();
  });

  it("AC-17: non-host does not see 'Tạo bộ vé mới'", () => {
    setBoard();
    render(ui({ isHost: false }));
    expect(screen.queryByTestId("ticket-renew")).not.toBeInTheDocument();
  });

  it("AC-13: host → confirm dialog → Tạo calls renewTicketSetAction", async () => {
    setBoard();
    h.renew.mockResolvedValue({ ok: true, data: { ticketSetNo: 2 } });
    render(ui({ isHost: true }));
    await userEvent.click(screen.getByTestId("ticket-renew"));
    const dialog = screen.getByTestId("renew-confirm");
    expect(dialog).toHaveTextContent(dict.ticket.renewConfirmTitle);
    expect(dialog).toHaveTextContent(dict.ticket.renewConfirmBody);
    await userEvent.click(screen.getByTestId("renew-create"));
    expect(h.renew).toHaveBeenCalledWith({ roomId: "r1" });
    await waitFor(() => expect(screen.queryByTestId("renew-confirm")).not.toBeInTheDocument());
  });

  it("cancel in confirm dialog does not call the action", async () => {
    setBoard();
    render(ui({ isHost: true }));
    await userEvent.click(screen.getByTestId("ticket-renew"));
    await userEvent.click(screen.getByTestId("renew-cancel"));
    expect(h.renew).not.toHaveBeenCalled();
  });

  it("AC-14/15: TICKETS_STILL_HELD → dialog #8; Thu hồi only for offline holders, calls reclaim", async () => {
    setBoard([player("b", "Bình", ["red_a"]), player("c", "Chi", ["blue_b"])]);
    h.presence = { status: "ready", map: { b: true } }; // c không có node = đã rời
    h.renew.mockResolvedValue({
      ok: false,
      error: { code: "TICKETS_STILL_HELD", message: "x", details: [{ code: "holder", uid: "b", displayName: "Bình", ticketIds: ["red_a"], online: true }] },
    });
    h.reclaim.mockResolvedValue({ ok: true, data: { uid: "c", releasedTicketIds: ["blue_b"] } });
    render(ui({ isHost: true }));
    await userEvent.click(screen.getByTestId("ticket-renew"));
    await userEvent.click(screen.getByTestId("renew-create"));

    const dialog = await screen.findByTestId("still-held-dialog");
    expect(dialog).toHaveTextContent(dict.ticket.stillHeldTitle);
    expect(within(dialog).getByTestId("still-held-row-b")).toHaveTextContent(dict.ticket.online);
    expect(within(dialog).getByTestId("still-held-row-b")).toHaveTextContent(dict.ticket.stillHeldRemind);
    expect(within(dialog).queryByTestId("ticket-reclaim-b")).not.toBeInTheDocument();
    expect(within(dialog).getByTestId("still-held-row-c")).toHaveTextContent(dict.ticket.offline);

    await userEvent.click(within(dialog).getByTestId("ticket-reclaim-c"));
    expect(h.reclaim).toHaveBeenCalledWith({ roomId: "r1", uid: "c" });
  });

  it("sheet/dialog close buttons use i18n text, not English 'Close'", () => {
    setBoard();
    render(ui());
    expect(screen.getByTestId("ticket-close")).toHaveTextContent(dict.ticket.close);
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });
});
