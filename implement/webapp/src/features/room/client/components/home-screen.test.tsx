// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { LEAVE_REASON_STORAGE_KEY } from "@/features/room/shared/constants";
import { HomeScreen } from "./home-screen";

type Entry = { status: "loading" | "ready" | "error"; raw: Record<string, unknown> | null };

// Firestore giả: test đặt trạng thái từng path, `useDocListener` đọc qua useSyncExternalStore.
const fake = vi.hoisted(() => {
  const docs = new Map<string, Entry>();
  const listeners = new Set<() => void>();
  /** `onData` của hook đang nghe path — gọi ngay khi có snapshot, như callback onSnapshot thật. */
  const onData = new Map<string, (raw: Record<string, unknown> | null) => void>();
  return {
    docs,
    onData,
    set(path: string, entry: Entry) {
      docs.set(path, entry);
      if (entry.status === "ready") onData.get(path)?.(entry.raw);
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
    useDocListener: (
      path: string | null,
      map: (d: Record<string, unknown>, id: string) => unknown,
      onData?: (data: unknown) => void,
    ) => {
      if (path && onData) {
        const id = path.split("/").pop()!;
        fake.onData.set(path, (raw) => onData(raw ? map(raw, id) : null));
      }
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
  push: vi.fn(),
  createRoomAction: vi.fn(),
  joinRoomAction: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/features/invite/server/actions/join-room.action", () => ({ joinRoomAction: mocks.joinRoomAction }));
vi.mock("@/features/room/server/actions/create-room.action", () => ({
  createRoomAction: mocks.createRoomAction,
}));

const UID = "u_an";
const future = () => new Date(Date.now() + 60 * 60 * 1000);
const roomDoc = (over: Record<string, unknown> = {}) => ({
  name: "Lô tô Tết",
  host_uid: UID,
  status: "active",
  member_count: 1,
  invite_code: "A".repeat(22),
  join_code: "ABC234",
  expires_at: future(),
  current_game_id: "g1",
  game_count: 1,
  close_reason: null,
  last_event: null,
  ...over,
});
const userDoc = (currentRoomId: string | null) => ({
  display_name: "An Nguyễn",
  photo_url: null,
  current_room_id: currentRoomId,
});

const set = (path: string, entry: Entry) => act(() => fake.set(path, entry));
const renderHome = () => render(<HomeScreen uid={UID} displayName="An Nguyễn" />);

describe("HomeScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.docs.clear();
    fake.onData.clear();
    sessionStorage.clear();
  });
  afterEach(cleanup);

  it("AC-20: skeleton until users listener answers; on listener error shows offline banner and Create stays clickable", async () => {
    renderHome();
    expect(screen.getByTestId("home-skeleton")).toBeInTheDocument();
    expect(screen.queryByTestId("create-room-button")).not.toBeInTheDocument();

    set(`users/${UID}`, { status: "error", raw: null });
    expect(screen.queryByTestId("home-skeleton")).not.toBeInTheDocument();
    expect(screen.getByTestId("home-offline-banner")).toHaveTextContent(dict.common.offline);
    const button = screen.getByTestId("create-room-button");
    expect(button).toBeEnabled();

    mocks.createRoomAction.mockResolvedValue({ ok: false, error: { code: "INTERNAL_ERROR", message: "x" } });
    await userEvent.click(button);
    expect(mocks.createRoomAction).toHaveBeenCalledWith({});
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(dict.home.createFailed));
  });

  it("AC-1: not in a room → greeting, placeholder, 0/50 counter, Create button, join hint card", () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    renderHome();
    expect(screen.getByTestId("home-greeting")).toHaveTextContent("Xin chào, An Nguyễn");
    expect(screen.getByTestId("room-name-input")).toHaveAttribute("placeholder", "Phòng của An Nguyễn");
    expect(screen.getByTestId("room-name-counter")).toHaveTextContent("0/50");
    expect(screen.getByTestId("create-room-button")).toHaveTextContent(dict.home.createRoom);
    expect(screen.getByTestId("join-hint-card")).toHaveTextContent(dict.home.joinTitle);
    expect(screen.getByTestId("join-hint-card")).toHaveTextContent(dict.home.joinHint);
    expect(screen.getByTestId("join-room-open-button")).toHaveTextContent(dict.home.joinButton);
    expect(screen.queryByTestId("current-room-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home-offline-banner")).not.toBeInTheDocument();
  });

  it("AC-2: success → button locked and router.push('/room')", async () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    mocks.createRoomAction.mockResolvedValue({ ok: true, data: { roomId: "r1" } });
    renderHome();
    await userEvent.type(screen.getByTestId("room-name-input"), "Lô tô Tết");
    await userEvent.click(screen.getByTestId("create-room-button"));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/room"));
    expect(mocks.createRoomAction).toHaveBeenCalledWith({ name: "Lô tô Tết" });
    expect(screen.getByTestId("create-room-button")).toBeDisabled();
  });

  it("AC-11: current_room_id set (e.g. from another tab) → card 9 with name, summary and Về phòng link", () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    renderHome();
    expect(screen.getByTestId("create-room-button")).toBeInTheDocument();

    set(`users/${UID}`, { status: "ready", raw: userDoc("r1") });
    expect(screen.getByTestId("current-room-card")).toBeInTheDocument();
    expect(screen.queryByTestId("create-room-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("join-hint-card")).not.toBeInTheDocument();

    set("rooms/r1", { status: "ready", raw: roomDoc() });
    set("rooms/r1/games/g1", { status: "ready", raw: { seq_no: 1, status: "waiting" } });
    expect(screen.getByTestId("current-room-card")).toHaveTextContent("Lô tô Tết");
    expect(screen.getByTestId("current-room-summary")).toHaveTextContent("Ván 1 · Chờ bắt đầu · 1 người");
    expect(screen.getByTestId("back-to-room-button")).toHaveAttribute("href", "/room");
  });

  it("AC-12: room closed then current_room_id → null → card gone, form back, expired banner; ✕ hides it", async () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc("r1") });
    set("rooms/r1", { status: "ready", raw: roomDoc() });
    set("rooms/r1/games/g1", { status: "ready", raw: { seq_no: 1, status: "waiting" } });
    renderHome();
    expect(screen.getByTestId("current-room-card")).toBeInTheDocument();

    set("rooms/r1", { status: "ready", raw: roomDoc({ status: "closed", close_reason: "expired", expires_at: new Date(0) }) });
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });

    expect(screen.queryByTestId("current-room-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("create-room-button")).toBeInTheDocument();
    expect(screen.getByTestId("leave-reason-banner")).toHaveTextContent('Phòng "Lô tô Tết" đã hết hạn.');
    expect(JSON.parse(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)!)).toEqual({
      reason: "expired",
      roomName: "Lô tô Tết",
    });

    await userEvent.click(screen.getByTestId("leave-reason-dismiss"));
    expect(screen.queryByTestId("leave-reason-banner")).not.toBeInTheDocument();
    expect(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)).toBeNull();
  });

  it("AC-12: room closed and current_room_id → null in the same render (background tab) → still expired banner", () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc("r1") });
    set("rooms/r1", { status: "ready", raw: roomDoc() });
    renderHome();

    act(() => {
      fake.set("rooms/r1", { status: "ready", raw: roomDoc({ status: "closed", close_reason: "expired", expires_at: new Date(0) }) });
      fake.set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    });

    expect(screen.getByTestId("leave-reason-banner")).toHaveTextContent('Phòng "Lô tô Tết" đã hết hạn.');
  });

  it("AC-12: room unreadable when leaving → 'Bạn không còn ở trong phòng.'", () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc("r1") });
    renderHome();
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    expect(screen.getByTestId("leave-reason-banner")).toHaveTextContent(dict.leaveReason.unknown);
  });

  it("AC-8: ALREADY_IN_ROOM → toast 'Bạn đang ở phòng {tên}' and card 9", async () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    mocks.createRoomAction.mockResolvedValue({
      ok: false,
      error: {
        code: "ALREADY_IN_ROOM",
        message: dict.error.ALREADY_IN_ROOM,
        details: [{ code: "current_room", currentRoomId: "r_old" }],
      },
    });
    renderHome();
    await userEvent.click(screen.getByTestId("create-room-button"));

    expect(await screen.findByTestId("current-room-card")).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalled();

    set("rooms/r_old", { status: "ready", raw: roomDoc({ name: "Phòng của Cúc", host_uid: "u_cuc" }) });
    set("rooms/r_old/games/g1", { status: "ready", raw: { seq_no: 1, status: "waiting" } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith("Bạn đang ở phòng Phòng của Cúc"));
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("current-room-card")).toHaveTextContent("Phòng của Cúc");
    expect(screen.getByTestId("current-room-summary")).toHaveTextContent("Ván 1 · Chờ bắt đầu · 1 người");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("AC-24: ALREADY_IN_ROOM from the room-code dialog → card 9 and toast 'Bạn đang ở phòng {tên}'", async () => {
    set(`users/${UID}`, { status: "ready", raw: userDoc(null) });
    mocks.joinRoomAction.mockResolvedValue({
      ok: false,
      error: {
        code: "ALREADY_IN_ROOM",
        message: dict.error.ALREADY_IN_ROOM,
        details: [{ code: "current_room", currentRoomId: "r_old" }],
      },
    });
    renderHome();
    await userEvent.click(screen.getByTestId("join-room-open-button"));
    await userEvent.type(screen.getByTestId("join-code-input"), "abc234");
    await userEvent.click(screen.getByTestId("join-code-submit"));
    expect(mocks.joinRoomAction).toHaveBeenCalledWith({ roomCode: "ABC234" });

    expect(await screen.findByTestId("current-room-card")).toBeInTheDocument();
    set("rooms/r_old", { status: "ready", raw: roomDoc({ name: "Phòng của Cúc", host_uid: "u_cuc" }) });
    set("rooms/r_old/games/g1", { status: "ready", raw: { seq_no: 1, status: "waiting" } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith("Bạn đang ở phòng Phòng của Cúc"));
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
