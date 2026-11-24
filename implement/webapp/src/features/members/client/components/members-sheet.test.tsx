// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PresenceEntry } from "@/features/members/shared/domain/member-rows";
import type { RoomPresenceState } from "@/features/members/client/hooks/use-room-presence";
import type { GameStatus } from "@/features/room/shared/types";
import { MembersSheet } from "./members-sheet";

vi.mock("@/features/room/server/actions/kick-player.action", () => ({ kickPlayerAction: vi.fn() }));
vi.mock("@/features/ticket/server/actions/reclaim-player-tickets.action", () => ({ reclaimPlayerTicketsAction: vi.fn() }));
vi.mock("@/features/members/client/hooks/use-room-presence", () => ({ useRoomPresence: () => ({ status: "loading", entries: [], retry: () => {} }) }));

const NOW = Date.UTC(2026, 10, 24, 9, 0);
const p = (uid: string, displayName: string, online: boolean, minutesAgo = 0): PresenceEntry => ({ uid, displayName, photoUrl: null, online, at: NOW - minutesAgo * 60_000 });
const ENTRIES = [p("u_chi", "Chi", false, 5), p("u_dung", "Dũng", true), p("u_binh", "Bình", true), p("u_an", "An", true)];
const PLAYERS = [
  { uid: "u_binh", ticketIds: ["red_a" as const] },
  { uid: "u_chi", ticketIds: ["blue_b" as const] },
];
const ready = (entries: PresenceEntry[]): RoomPresenceState => ({ status: "ready", entries, retry: vi.fn() });

function setup(opts: { uid?: string; gameStatus?: GameStatus; presence?: RoomPresenceState; memberCount?: number } = {}) {
  const run = vi.fn(async () => true);
  render(
    <MembersSheet
      roomId="r1"
      open
      onClose={vi.fn()}
      bottom={0}
      uid={opts.uid ?? "u_binh"}
      hostUid="u_an"
      memberCount={opts.memberCount ?? 4}
      gameStatus={opts.gameStatus ?? "waiting"}
      players={PLAYERS}
      nowMs={NOW}
      presence={opts.presence ?? ready(ENTRIES)}
      actions={{ pending: null, run }}
    />,
  );
  return { run };
}

const rowIds = () => screen.getAllByTestId(/^member-row-/).map((el) => el.dataset.testid);

describe("MembersSheet", () => {
  afterEach(cleanup);

  it("AC-1: player view — title, order, status, ticket chips, no host buttons", () => {
    setup();
    expect(screen.getByTestId("members-title")).toHaveTextContent("Người trong phòng · 4/16");
    expect(rowIds()).toEqual(["member-row-u_an", "member-row-u_binh", "member-row-u_dung", "member-row-u_chi"]);
    expect(screen.getByTestId("member-host-u_an")).toHaveTextContent("Host");
    expect(screen.getByTestId("member-row-u_binh")).toHaveTextContent("(Bạn)");
    expect(screen.getByTestId("member-status-u_chi")).toHaveTextContent("Offline · 5 phút");
    expect(screen.getByTestId("member-status-u_dung")).toHaveTextContent("Online");
    expect(screen.getByTestId("member-ticket-u_binh-red_a")).toHaveTextContent("Đỏ A");
    expect(screen.getByTestId("member-ticket-u_chi-blue_b")).toHaveTextContent("Lam B");
    expect(screen.getByTestId("member-noticket-u_dung")).toHaveTextContent("Chưa lấy vé");
    expect(screen.queryByTestId(/^btn-(kick|reclaim)-/)).not.toBeInTheDocument();
  });

  it("AC-7: host view — Kick on Bình and Chi, Thu hồi vé only on Chi, nothing on An / Dũng", () => {
    setup({ uid: "u_an" });
    expect(screen.getByTestId("btn-kick-u_binh")).toBeInTheDocument();
    expect(screen.getByTestId("btn-kick-u_chi")).toBeInTheDocument();
    expect(screen.getByTestId("btn-reclaim-u_chi")).toHaveTextContent("Thu hồi vé");
    expect(screen.queryByTestId("btn-reclaim-u_binh")).not.toBeInTheDocument();
    for (const uid of ["u_an", "u_dung"]) {
      expect(within(screen.getByTestId(`member-row-${uid}`)).queryByRole("button")).not.toBeInTheDocument();
    }
  });

  it("AC-3: Kick → dialog with consequence → Kick calls the action", async () => {
    const { run } = setup({ uid: "u_an" });
    await userEvent.click(screen.getByTestId("btn-kick-u_binh"));
    const dialog = await screen.findByTestId("kick-dialog");
    expect(dialog).toHaveTextContent("Kick Bình?");
    expect(dialog).toHaveTextContent("không vào lại được");
    await userEvent.click(screen.getByTestId("btn-member-confirm"));
    expect(run).toHaveBeenCalledWith("kick", "u_binh", "Bình");
  });

  it("AC-4: running game — kick dialog mentions the locked tickets; AC-11: no Thu hồi vé", async () => {
    setup({ uid: "u_an", gameStatus: "running" });
    expect(screen.queryByTestId(/^btn-reclaim-/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("btn-kick-u_binh"));
    expect(await screen.findByTestId("kick-dialog")).toHaveTextContent("bị khóa tới hết ván");
  });

  it("AC-9: Thu hồi vé → dialog names the ticket → Thu hồi calls reclaim; Hủy closes without calling", async () => {
    const { run } = setup({ uid: "u_an" });
    await userEvent.click(screen.getByTestId("btn-reclaim-u_chi"));
    const dialog = await screen.findByTestId("reclaim-dialog");
    expect(dialog).toHaveTextContent("Thu hồi vé của Chi?");
    expect(dialog).toHaveTextContent("Chi đang offline. Vé Lam B sẽ trả về bộ vé.");
    await userEvent.click(screen.getByTestId("btn-member-cancel"));
    expect(run).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId("btn-reclaim-u_chi"));
    await userEvent.click(await screen.findByTestId("btn-member-confirm"));
    expect(run).toHaveBeenCalledWith("reclaim", "u_chi", "Chi");
  });

  it("AC-12: host alone → invite hint", () => {
    setup({ uid: "u_an", memberCount: 1, presence: ready([p("u_an", "An", true)]) });
    expect(screen.getByTestId("member-row-u_an")).toHaveTextContent("(Bạn)");
    expect(screen.getByTestId("members-invite-hint")).toHaveTextContent("Bấm Mời để gọi bạn vào phòng");
  });

  it("loading → 4 skeleton rows; error → message + Thử lại", async () => {
    setup({ presence: { status: "loading", entries: [], retry: vi.fn() } });
    expect(screen.getByTestId("members-loading").children).toHaveLength(4);
    cleanup();
    const retry = vi.fn();
    setup({ presence: { status: "error", entries: [], retry } });
    expect(screen.getByTestId("members-error")).toHaveTextContent("Không tải được danh sách");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(retry).toHaveBeenCalled();
  });
});
