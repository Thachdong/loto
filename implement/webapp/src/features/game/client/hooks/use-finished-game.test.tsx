// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeGame } from "@/features/game/client/test-fixtures";
import type { GameView } from "@/features/room/shared/types";
import type { PlayerView } from "@/features/ticket/shared/types";
import { useFinishedGame } from "./use-finished-game";

const docs = vi.hoisted(() => ({ map: new Map<string, unknown>() }));
vi.mock("@/core/client/hooks/use-doc-listener", () => ({
  useDocListener: (path: string | null) => ({ status: path ? "ready" : "idle", data: path ? (docs.map.get(path) ?? null) : null, errorCode: null }),
}));
vi.mock("@/features/room/client", () => ({ mapGameDoc: vi.fn() }));

const me = (ids: string[]): PlayerView => ({ uid: "u_me", displayName: "me", photoUrl: null, ticketIds: ids as PlayerView["ticketIds"] });

function setup() {
  return renderHook(
    (p: { current: GameView; players: PlayerView[] }) =>
      useFinishedGame({ roomId: "r1", uid: "u_me", current: p.current, currentPlayers: p.players, playersReady: true }),
    { initialProps: { current: makeGame("running", { id: "g1" }), players: [me(["red_a"])] } },
  );
}

describe("useFinishedGame", () => {
  it("AC-11: watches the live game, shows it once finished after current_game_id moves, until dismissed", () => {
    docs.map.set("rooms/r1/games/g1", makeGame("finished", { id: "g1", result: "won" }));
    docs.map.set("rooms/r1/games/g1/players/u_me", me(["red_a"]));
    const { result, rerender } = setup();
    expect(result.current.game).toBeNull();
    rerender({ current: makeGame("waiting", { id: "g2", seqNo: 2 }), players: [me(["red_a"])] });
    expect(result.current.game?.id).toBe("g1");
    expect(result.current.ticketLine).toBe("kept");
    expect(result.current.nextSeqNo).toBe(2);
    act(() => result.current.dismiss());
    expect(result.current.game).toBeNull();
  });

  it("AC-12: had tickets in the finished game but none in the new one → released", () => {
    docs.map.set("rooms/r1/games/g1", makeGame("finished", { id: "g1", result: "no_winner" }));
    docs.map.set("rooms/r1/games/g1/players/u_me", me(["red_a"]));
    const { result, rerender } = setup();
    rerender({ current: makeGame("waiting", { id: "g2", seqNo: 2 }), players: [] });
    expect(result.current.ticketLine).toBe("released");
  });

  it("a cancelled old game (host closed the room) shows nothing", () => {
    docs.map.set("rooms/r1/games/g1", makeGame("cancelled", { id: "g1" }));
    const { result, rerender } = setup();
    rerender({ current: makeGame("waiting", { id: "g2" }), players: [] });
    expect(result.current.game).toBeNull();
  });
});
