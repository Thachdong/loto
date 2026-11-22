// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import type { GameRoomState } from "@/features/game/client/hooks/use-game-room";
import { HOST, ME, makeGame, makeRoom, makeState, makeTicket } from "@/features/game/client/test-fixtures";
import { RoomScreen } from "./room-screen";

const h = vi.hoisted(() => ({
  state: null as unknown as GameRoomState,
  replace: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  claim: vi.fn(),
}));

vi.mock("@/features/game/client/hooks/use-game-room", () => ({ useGameRoom: () => h.state }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: h.replace, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/core/client/hooks/use-presence", () => ({ usePresence: vi.fn() }));
vi.mock("@/features/ticket/client", async () => {
  const actual = await vi.importActual<typeof import("@/features/ticket/client")>("@/features/ticket/client");
  return {
    PaperTicket: actual.PaperTicket,
    TicketSheet: (p: { open: boolean }) => (p.open ? <div data-testid="ticket-sheet" /> : null),
  };
});
vi.mock("@/features/game/server/actions/start-game.action", () => ({ startGameAction: (...a: unknown[]) => h.start(...a) }));
vi.mock("@/features/game/server/actions/pause-game.action", () => ({ pauseGameAction: (...a: unknown[]) => h.pause(...a) }));
vi.mock("@/features/game/server/actions/resume-game.action", () => ({ resumeGameAction: (...a: unknown[]) => h.resume(...a) }));
vi.mock("@/features/game/server/actions/create-claim.action", () => ({ createClaimAction: (...a: unknown[]) => h.claim(...a) }));

const players = (...p: { uid: string; ticketIds: ReturnType<typeof makeTicket>["id"][] }[]) =>
  p.map((x) => ({ ...x, displayName: x.uid, photoUrl: null }));

function setState(over: Partial<GameRoomState>) {
  h.state = makeState(over);
}

describe("RoomScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    h.start.mockResolvedValue({ ok: true, data: {} });
    h.pause.mockResolvedValue({ ok: true, data: {} });
    h.resume.mockResolvedValue({ ok: true, data: {} });
    setState({});
  });
  afterEach(cleanup);

  it("loading: skeleton until room + game arrive", () => {
    setState({ room: null, game: null });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("room-skeleton")).toBeInTheDocument();
  });

  it("waiting (host): subtitle, 'Bắt đầu' enabled with held/members hint, number panel empty, no tickets card", () => {
    setState({ players: players({ uid: "b", ticketIds: ["red_a"] }, { uid: "c", ticketIds: ["blue_a", "blue_b"] }) });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("game-subtitle")).toHaveTextContent("Ván 1 · Chờ bắt đầu");
    expect(screen.getByTestId("btn-invite")).toBeInTheDocument();
    expect(screen.getByTestId("btn-leave")).toBeInTheDocument();
    expect(screen.getByTestId("last-number")).toHaveTextContent("–");
    expect(screen.getByTestId("next-countdown")).toHaveTextContent("Nhịp quay 5 giây/số");
    expect(screen.getByTestId("btn-start")).toBeEnabled();
    expect(screen.getByTestId("host-hint")).toHaveTextContent("3/16 vé đã có chủ · 3 người trong phòng");
    expect(screen.getByTestId("no-ticket-card")).toHaveTextContent(dict.me.noTicket);
  });

  it("waiting (host) with 0 tickets: Bắt đầu disabled + 'Cần ít nhất 1 người lấy vé'; closing hides the button", () => {
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("btn-start")).toBeDisabled();
    expect(screen.getByTestId("host-hint")).toHaveTextContent(dict.host.needTicket);
    cleanup();
    setState({ room: makeRoom({ status: "closing" }) });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.queryByTestId("btn-start")).not.toBeInTheDocument();
    expect(screen.getByTestId("expiry-chip")).toHaveTextContent(dict.game.closingChip);
  });

  it("host clicks Bắt đầu → startGameAction({roomId, gameId})", async () => {
    setState({ players: players({ uid: "b", ticketIds: ["red_a"] }) });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    await userEvent.click(screen.getByTestId("btn-start"));
    expect(h.start).toHaveBeenCalledWith({ roomId: "r1", gameId: "g1" });
  });

  it("start error NO_TICKETS_HELD → toast 'Cần ít nhất 1 người lấy vé'", async () => {
    h.start.mockResolvedValue({ ok: false, error: { code: "NO_TICKETS_HELD", message: "x" } });
    setState({ players: players({ uid: "b", ticketIds: ["red_a"] }) });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    await userEvent.click(screen.getByTestId("btn-start"));
    expect(h.toast.error).toHaveBeenCalledWith(dict.err.noTickets);
  });

  it("waiting (player): me-status line, no host controls, no Mời; Rời visible", () => {
    setState({ players: players({ uid: "b", ticketIds: ["red_a"] }) });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("me-status")).toHaveTextContent("Chờ host bắt đầu · 1 vé đã có chủ");
    expect(screen.queryByTestId("host-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-invite")).not.toBeInTheDocument();
    expect(screen.getByTestId("btn-leave")).toBeInTheDocument();
  });

  it("running (host): countdown, last number, count, recent 5 newest-first, Tạm dừng", async () => {
    setState({
      room: makeRoom({ calledNumbers: [4, 8, 15, 16, 23, 42, 7] }),
      game: makeGame("running"),
    });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("last-number")).toHaveTextContent("7");
    expect(screen.getByTestId("called-count")).toHaveTextContent("Số thứ 7/90");
    expect(screen.getByTestId("next-countdown")).toHaveTextContent(/Số kế tiếp sau [1-3] giây/);
    const recent = within(screen.getByTestId("recent-numbers")).getAllByRole("listitem").map((li) => li.textContent);
    expect(recent).toEqual(["42", "23", "16", "15", "8"]);
    await userEvent.click(screen.getByTestId("btn-pause"));
    expect(h.pause).toHaveBeenCalledWith({ roomId: "r1", gameId: "g1" });
  });

  it("paused: panel '⏸ Host đã tạm dừng', host sees Tiếp tục, player line 'Host đã tạm dừng ván'", async () => {
    setState({ room: makeRoom({ calledNumbers: [4] }), game: makeGame("paused") });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("next-countdown")).toHaveTextContent(dict.panel.paused);
    expect(screen.getByTestId("game-subtitle")).toHaveTextContent("Tạm dừng");
    await userEvent.click(screen.getByTestId("btn-resume"));
    expect(h.resume).toHaveBeenCalledTimes(1);
    cleanup();
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("me-status")).toHaveTextContent(dict.me.paused);
  });

  it("awaiting_confirm: 'Chờ host duyệt KINH' in subtitle and panel; host controls empty", () => {
    setState({ room: makeRoom({ calledNumbers: [4] }), game: makeGame("awaiting_confirm") });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("game-subtitle")).toHaveTextContent("Chờ host duyệt KINH");
    expect(screen.getByTestId("next-countdown")).toHaveTextContent(dict.panel.checking);
    expect(screen.queryByTestId("btn-pause")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-resume")).not.toBeInTheDocument();
    expect(screen.queryByTestId("btn-start")).not.toBeInTheDocument();
  });

  it("waiting ignores stale called_numbers from the previous game", () => {
    setState({ room: makeRoom({ calledNumbers: [4, 5, 6] }), game: makeGame("waiting") });
    render(<RoomScreen uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("last-number")).toHaveTextContent("–");
  });

  it("spectator while running: spectator note, no tickets", () => {
    setState({ room: makeRoom({ calledNumbers: [4] }), game: makeGame("running") });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("spectator-note")).toHaveTextContent(dict.me.spectator);
    expect(screen.queryByTestId("no-ticket-card")).not.toBeInTheDocument();
  });

  it("1 ticket (manual, running): single layout, tap toggles mark and survives re-render", async () => {
    const ticket = makeTicket("red_a", 0);
    setState({
      room: makeRoom({ calledNumbers: [1] }),
      game: makeGame("running"),
      players: players({ uid: ME, ticketIds: ["red_a"] }),
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["red_a"] },
      myTickets: [ticket],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("number-panel")).toHaveAttribute("data-compact", "false");
    const root = screen.getByTestId("ticket-red_a");
    expect(root).toHaveAttribute("data-size", "single");
    const cell = root.querySelector("[data-cell='1']") as HTMLElement;
    expect(cell).toHaveAttribute("data-marked", "false");
    await userEvent.click(cell);
    expect(root.querySelector("[data-cell='1']")).toHaveAttribute("data-marked", "true");
    expect(JSON.parse(localStorage.getItem("g1:red_a")!)).toEqual([1]);
    expect(screen.getByTestId("me-status")).toHaveTextContent("Bạn đang chơi 1 vé · mode Tự dò");
  });

  it("2 tickets: double layout + compact panel/header", () => {
    setState({
      room: makeRoom({ calledNumbers: [1] }),
      game: makeGame("running"),
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["blue_a", "blue_b"] },
      myTickets: [makeTicket("blue_a", 0), makeTicket("blue_b", 50)],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("number-panel")).toHaveAttribute("data-compact", "true");
    expect(screen.getByTestId("room-header")).toHaveStyle({ height: "52px" });
    expect(screen.getByTestId("ticket-blue_a")).toHaveAttribute("data-size", "double");
    expect(screen.getByTestId("ticket-blue_b")).toHaveAttribute("data-size", "double");
  });

  it("auto mode: marked from called numbers, hit on the last number, waiting row", () => {
    localStorage.setItem("loto:mode", "auto");
    // hàng 0 của vé: 1..5 → đã rao 1,2,3,4 (thiếu 1) ; số vừa rao 4
    setState({
      room: makeRoom({ calledNumbers: [1, 2, 3, 4] }),
      game: makeGame("running"),
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["red_a"] },
      myTickets: [makeTicket("red_a", 0)],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    const root = screen.getByTestId("ticket-red_a");
    expect(root.querySelector("[data-cell='2']")).toHaveAttribute("data-marked", "true");
    expect(root.querySelector("[data-cell='4']")).toHaveAttribute("data-hit", "true");
    expect(root.querySelector("[data-cell='5']")).toHaveAttribute("data-waiting", "true");
    expect(screen.getByTestId("me-status")).toHaveTextContent("mode Auto");
    expect(root.querySelector("button")).toBeNull();
  });

  it("waiting with a ticket: tapping the ticket opens the ticket sheet and does not mark", async () => {
    setState({
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["red_a"] },
      myTickets: [makeTicket("red_a", 0)],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    await userEvent.click(screen.getByTestId("ticket-open-red_a"));
    expect(screen.getByTestId("ticket-sheet")).toBeInTheDocument();
    expect(localStorage.getItem("g1:red_a")).toBeNull();
  });

  it("'Chọn vé' button on the empty card opens the ticket sheet", async () => {
    render(<RoomScreen uid={ME} roomId="r1" />);
    await userEvent.click(screen.getByTestId("btn-pick-ticket"));
    expect(screen.getByTestId("ticket-sheet")).toBeInTheDocument();
  });

  it("expiry chip shows ≤ 15 minutes remaining", () => {
    setState({ room: makeRoom({ expiresAt: new Date(Date.now() + 14 * 60_000) }) });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("expiry-chip")).toHaveTextContent(/⏱ Còn 1[34]:\d\d/);
  });

  it("overlay buttons record the open overlay for wave B (renderExtras)", async () => {
    const seen: (string | null)[] = [];
    render(
      <RoomScreen
        uid={HOST}
        roomId="r1"
        renderExtras={(ctx) => {
          seen.push(ctx.overlay);
          return <div data-testid="extras">{ctx.overlay}</div>;
        }}
      />,
    );
    await userEvent.click(screen.getByTestId("btn-invite"));
    expect(screen.getByTestId("extras")).toHaveTextContent("invite");
    await userEvent.click(screen.getByTestId("btn-leave"));
    expect(screen.getByTestId("extras")).toHaveTextContent("leave");
    await userEvent.click(screen.getByTestId("btn-board90"));
    expect(screen.getByTestId("extras")).toHaveTextContent("board90");
  });

  it("offline → banner", () => {
    setState({ offline: true });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("home-offline-banner")).toBeInTheDocument();
  });


  it("awaiting_confirm: temp claim card above the tickets, KINH bar still there and enabled for another ticket", () => {
    setState({
      room: makeRoom({ calledNumbers: [4] }),
      game: makeGame("awaiting_confirm", {
        claims: [{ uid: "u_c", displayName: "Cúc", ticketId: "blue_a", color: "blue", result: "win", row: 0, claimedAtMs: 1 }],
      }),
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["red_a"] },
      myTickets: [makeTicket("red_a", 0)],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("claim-card")).toHaveTextContent("Cúc KINH!");
    expect(screen.getByTestId("claim-item-u_c-blue_a")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-red_a")).toBeInTheDocument();
    expect(screen.getByTestId("btn-kinh")).toBeEnabled();
  });

  it("KINH with 1 ticket calls createClaimAction({roomId, gameId, ticketId}); error code → toast", async () => {
    h.claim.mockResolvedValue({ ok: false, error: { code: "CLAIMS_CLOSED", message: "x" } });
    setState({
      room: makeRoom({ calledNumbers: [4] }),
      game: makeGame("running"),
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["red_a"] },
      myTickets: [makeTicket("red_a", 0)],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    await userEvent.click(screen.getByTestId("btn-kinh"));
    expect(h.claim).toHaveBeenCalledWith({ roomId: "r1", gameId: "g1", ticketId: "red_a" });
    expect(h.toast.error).toHaveBeenCalledWith(dict.err.claimsClosed);
  });

  it("KINH network failure → 'Chưa gửi được KINH, bấm lại'", async () => {
    h.claim.mockRejectedValue(new Error("network"));
    setState({
      game: makeGame("running"),
      me: { uid: ME, displayName: "me", photoUrl: null, ticketIds: ["red_a"] },
      myTickets: [makeTicket("red_a", 0)],
    });
    render(<RoomScreen uid={ME} roomId="r1" />);
    await userEvent.click(screen.getByTestId("btn-kinh"));
    expect(h.toast.error).toHaveBeenCalledWith(dict.err.claimNetwork);
  });

  it("no KINH bar while waiting or for a spectator", () => {
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.queryByTestId("kinh-bar")).not.toBeInTheDocument();
    cleanup();
    setState({ room: makeRoom({ calledNumbers: [4] }), game: makeGame("running") });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.queryByTestId("kinh-bar")).not.toBeInTheDocument();
  });

  it("bottom bar: 5 tabs; Vé opens the ticket sheet, the others open the 'Sắp có' frame", async () => {
    render(<RoomScreen uid={ME} roomId="r1" />);
    const bar = screen.getByTestId("bottom-bar");
    for (const tab of ["tickets", "chat", "members", "history", "settings"]) {
      expect(within(bar).getByTestId(`tab-${tab}`)).toBeInTheDocument();
    }
    await userEvent.click(screen.getByTestId("tab-tickets"));
    expect(screen.getByTestId("ticket-sheet")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("tab-chat"));
    expect(await screen.findByTestId("sheet-coming-soon")).toHaveTextContent(dict.bottomBar.comingSoon);
  });

  it("the skeleton already shows the bottom bar", () => {
    setState({ room: null, game: null });
    render(<RoomScreen uid={ME} roomId="r1" />);
    expect(screen.getByTestId("bottom-bar")).toBeInTheDocument();
  });
});
