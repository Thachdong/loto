// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { LEAVE_REASON_STORAGE_KEY } from "@/features/room/shared/constants";
import { RoomLobby } from "./room-lobby";

type Entry = { status: "loading" | "ready" | "error"; raw: Record<string, unknown> | null };

// Firestore giả: test đặt trạng thái từng path, `useDocListener` đọc qua useSyncExternalStore.
const fake = vi.hoisted(() => {
  const docs = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  return {
    docs,
    set(path: string, entry: Entry) {
      docs.set(path, entry);
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
});

vi.mock("@/core/client/hooks/use-doc-listener", async () => {
  const React = await import("react");
  return {
    useDocListener: (path: string | null, map: (d: Record<string, unknown>, id: string) => unknown) => {
      const entry = React.useSyncExternalStore(fake.subscribe, () => (path ? fake.docs.get(path) : undefined));
      return React.useMemo(() => {
        if (!path) return { status: "idle", data: null, errorCode: null };
        if (!entry) return { status: "loading", data: null, errorCode: null };
        const id = path.split("/").pop()!;
        return {
          status: entry.status,
          data: entry.raw ? map(entry.raw, id) : null,
          errorCode: entry.status === "error" ? "unavailable" : null,
        };
      }, [entry, path, map]);
    },
  };
});

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace, push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));

const HOST = "u_an";
const INVITE = "AbCdEfGhIjKlMnOpQrStUv";
const roomDoc = (over: Record<string, unknown> = {}) => ({
  name: "Lô tô Tết",
  host_uid: HOST,
  status: "active",
  member_count: 1,
  invite_code: INVITE,
  join_code: "ABC234",
  expires_at: new Date(Date.now() + 3_600_000),
  current_game_id: "g1",
  game_count: 1,
  close_reason: null,
  last_event: null,
  ...over,
});
const set = (path: string, entry: Entry) => act(() => fake.set(path, entry));

function seedRoom(uid: string) {
  set(`users/${uid}`, { status: "ready", raw: { display_name: "X", photo_url: null, current_room_id: "r1" } });
  set("rooms/r1", { status: "ready", raw: roomDoc() });
  set("rooms/r1/games/g1", { status: "ready", raw: { seq_no: 1, status: "waiting" } });
}

describe("RoomLobby", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.docs.clear();
    sessionStorage.clear();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  });

  it("skeleton until the room snapshot arrives", () => {
    render(<RoomLobby uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("room-skeleton")).toBeInTheDocument();
  });

  it("AC-2: host sees name, 'Ván 1 · Chờ bắt đầu', '1 người', room code, invite link and Copy link", async () => {
    seedRoom(HOST);
    render(<RoomLobby uid={HOST} roomId="r1" />);
    expect(screen.getByTestId("room-name")).toHaveTextContent("Lô tô Tết");
    expect(screen.getByTestId("room-game-line")).toHaveTextContent("Ván 1 · Chờ bắt đầu");
    expect(screen.getByTestId("room-members")).toHaveTextContent("1 người");
    expect(screen.getByTestId("room-code")).toHaveTextContent("ABC234");
    expect(screen.getByTestId("room-invite-link")).toHaveTextContent(`http://localhost:3000/join/${INVITE}`);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await userEvent.click(screen.getByTestId("room-copy-link"));
    expect(writeText).toHaveBeenCalledWith(`http://localhost:3000/join/${INVITE}`);
    await waitFor(() => expect(mocks.toast.success).toHaveBeenCalledWith(dict.room.copied));
  });

  it("non-host sees room code but no invite link / Copy link", () => {
    seedRoom("u_binh");
    render(<RoomLobby uid="u_binh" roomId="r1" />);
    expect(screen.getByTestId("room-code")).toHaveTextContent("ABC234");
    expect(screen.queryByTestId("room-invite-link")).not.toBeInTheDocument();
    expect(screen.queryByTestId("room-copy-link")).not.toBeInTheDocument();
  });

  it("AC-13: current_room_id → null → writes leave reason and router.replace('/')", () => {
    seedRoom(HOST);
    render(<RoomLobby uid={HOST} roomId="r1" />);
    set("rooms/r1", { status: "ready", raw: roomDoc({ status: "closed", close_reason: "expired" }) });
    set(`users/${HOST}`, { status: "ready", raw: { display_name: "X", photo_url: null, current_room_id: null } });

    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.replace).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)!)).toEqual({
      reason: "expired",
      roomName: "Lô tô Tết",
    });
  });

  it("AC-13: first users snapshot already null → back to '/' with unknown reason", () => {
    render(<RoomLobby uid={HOST} roomId="r1" />);
    set(`users/${HOST}`, { status: "ready", raw: { display_name: "X", photo_url: null, current_room_id: null } });
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(JSON.parse(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)!).reason).toBe("unknown");
  });

  it("users listener error → offline banner, room still shown", () => {
    seedRoom(HOST);
    render(<RoomLobby uid={HOST} roomId="r1" />);
    set(`users/${HOST}`, { status: "error", raw: { display_name: "X", photo_url: null, current_room_id: "r1" } });
    expect(screen.getByTestId("home-offline-banner")).toBeInTheDocument();
    expect(screen.getByTestId("room-name")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
