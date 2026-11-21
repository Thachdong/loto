// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { JoinScreen } from "./join-screen";

const CODE = "A".repeat(22);
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  joinRoomAction: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/features/invite/server/actions/join-room.action", () => ({ joinRoomAction: mocks.joinRoomAction }));
vi.mock("@/core/client/hooks/use-doc-listener", () => ({
  useDocListener: (path: string | null) => ({
    status: path ? "ready" : "idle",
    data: path ? "Phòng của Cúc" : null,
    errorCode: null,
  }),
}));

const fail = (code: string, details?: unknown[]) => ({ ok: false, error: { code, message: "x", details } });

function renderScreen(over: Partial<React.ComponentProps<typeof JoinScreen>> = {}) {
  return render(
    <JoinScreen
      code={CODE}
      hostName="An Nguyễn"
      hostPhotoUrl={null}
      roomName="Lô tô Tết"
      expiresLabel="20:00"
      signedIn
      otherRoomId={null}
      {...over}
    />,
  );
}

describe("JoinScreen", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("AC-1: shows host initial fallback, invitation, room name, expiry and no member count", () => {
    renderScreen();
    expect(screen.getByTestId("join-host-avatar")).toHaveTextContent("A");
    expect(screen.getByTestId("join-title")).toHaveTextContent("An Nguyễn mời bạn chơi lô tô");
    expect(screen.getByTestId("join-room-name")).toHaveTextContent("Lô tô Tết");
    expect(screen.getByTestId("join-expires")).toHaveTextContent("Link hết hạn lúc 20:00");
    expect(screen.getByTestId("join-primary-button")).toHaveTextContent(dict.join.joinRoom);
    expect(document.body.textContent).not.toMatch(/người/);
  });

  it("AC-19: signed out → 'Đăng nhập để vào phòng' links to /login?returnTo=/join/{code}", () => {
    renderScreen({ signedIn: false });
    const link = screen.getByTestId("join-primary-button");
    expect(link).toHaveTextContent(dict.join.signInToJoin);
    expect(link).toHaveAttribute("href", `/login?returnTo=/join/${CODE}`);
    expect(mocks.joinRoomAction).not.toHaveBeenCalled();
  });

  it("AC-3: click → 'Đang vào phòng…' locked, joinRoomAction({inviteCode}), then router.push('/room')", async () => {
    let resolve!: (v: unknown) => void;
    mocks.joinRoomAction.mockReturnValue(new Promise((r) => (resolve = r)));
    renderScreen();
    await userEvent.click(screen.getByTestId("join-primary-button"));
    expect(mocks.joinRoomAction).toHaveBeenCalledWith({ inviteCode: CODE });
    await waitFor(() => expect(screen.getByTestId("join-primary-button")).toBeDisabled());
    expect(screen.getByTestId("join-primary-button")).toHaveTextContent(dict.join.joining);
    resolve({ ok: true, data: { roomId: "r1", alreadyMember: false } });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/room"));
    expect(screen.getByTestId("join-primary-button")).toBeDisabled();
  });

  it("AC-6: alreadyMember counts as success → /room", async () => {
    mocks.joinRoomAction.mockResolvedValue({ ok: true, data: { roomId: "r1", alreadyMember: true } });
    renderScreen();
    await userEvent.click(screen.getByTestId("join-primary-button"));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/room"));
  });

  it.each([
    ["INVITE_INVALID", "invalid"],
    ["INVITE_EXPIRED", "invalid"],
    ["ROOM_FULL", "full"],
    ["BLOCKED_FROM_ROOM", "blocked"],
  ])("AC-9/AC-10/AC-13: %s → error frame '%s'", async (code, variant) => {
    mocks.joinRoomAction.mockResolvedValue(fail(code));
    renderScreen();
    await userEvent.click(screen.getByTestId("join-primary-button"));
    const frame = await screen.findByTestId("join-error");
    expect(frame).toHaveAttribute("data-variant", variant);
    expect(screen.queryByTestId("join-primary-button")).not.toBeInTheDocument();
  });

  it("AC-11: ALREADY_IN_ROOM → dialog with current room name; 'Đóng' keeps the invite", async () => {
    mocks.joinRoomAction.mockResolvedValue(fail("ALREADY_IN_ROOM", [{ code: "current_room", currentRoomId: "r_old" }]));
    renderScreen();
    await userEvent.click(screen.getByTestId("join-primary-button"));
    expect(await screen.findByTestId("join-other-room-body")).toHaveTextContent("Phòng của Cúc");
    expect(screen.getByTestId("join-other-room-go")).toHaveAttribute("href", "/room");
    await userEvent.click(screen.getByTestId("join-other-room-close"));
    await waitFor(() => expect(screen.queryByTestId("join-other-room-dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("join-primary-button")).toBeEnabled();
  });

  it("AC-11: viewer already in another room on load → dialog opens immediately", () => {
    renderScreen({ otherRoomId: "r_old" });
    expect(screen.getByTestId("join-other-room-dialog")).toBeInTheDocument();
  });

  it("AC-19: UNAUTHENTICATED → router.replace('/login?returnTo=/join/{code}')", async () => {
    mocks.joinRoomAction.mockResolvedValue(fail("UNAUTHENTICATED"));
    renderScreen();
    await userEvent.click(screen.getByTestId("join-primary-button"));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(`/login?returnTo=/join/${CODE}`));
  });

  it("other error or thrown → toast 'Không vào được phòng, thử lại' and button unlocked", async () => {
    mocks.joinRoomAction.mockResolvedValueOnce(fail("INTERNAL_ERROR"));
    renderScreen();
    await userEvent.click(screen.getByTestId("join-primary-button"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(dict.join.joinFailed));
    await waitFor(() => expect(screen.getByTestId("join-primary-button")).toBeEnabled());

    mocks.joinRoomAction.mockRejectedValueOnce(new Error("network"));
    await userEvent.click(screen.getByTestId("join-primary-button"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(2));
  });
});
