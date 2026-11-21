// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { LEAVE_REASON_STORAGE_KEY } from "@/features/room/shared/constants";
import { JoinRoomCard } from "./join-room-card";

const mocks = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), joinRoomAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, replace: mocks.replace }) }));
vi.mock("@/features/invite/server/actions/join-room.action", () => ({ joinRoomAction: mocks.joinRoomAction }));

const fail = (code: string, details?: unknown[]) => ({ ok: false, error: { code, message: "x", details } });

async function openAndType(text: string, onAlreadyInRoom = vi.fn()) {
  render(<JoinRoomCard onAlreadyInRoom={onAlreadyInRoom} />);
  await userEvent.click(screen.getByTestId("join-room-open-button"));
  await userEvent.type(screen.getByTestId("join-code-input"), text);
  return onAlreadyInRoom;
}

describe("JoinRoomCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });
  afterEach(cleanup);

  it("AC-24: card shows title, hint and 'Vào phòng' button; dialog opens with code field", async () => {
    render(<JoinRoomCard onAlreadyInRoom={vi.fn()} />);
    expect(screen.getByTestId("join-hint-card")).toHaveTextContent(dict.home.joinTitle);
    expect(screen.getByTestId("join-hint-card")).toHaveTextContent(dict.home.joinHint);
    expect(screen.queryByTestId("join-code-dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("join-room-open-button"));
    expect(screen.getByTestId("join-code-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("join-code-input")).toHaveAttribute("autocapitalize", "characters");
    expect(screen.getByTestId("join-code-submit")).toBeDisabled();
  });

  it("AC-24: upper-cases, strips spaces/invalid chars and enables 'Vào' only at 6 characters", async () => {
    render(<JoinRoomCard onAlreadyInRoom={vi.fn()} />);
    await userEvent.click(screen.getByTestId("join-room-open-button"));
    const input = screen.getByTestId("join-code-input");
    await userEvent.type(input, "k7 m2q");
    expect(input).toHaveValue("K7M2Q");
    expect(screen.getByTestId("join-code-submit")).toBeDisabled();
    await userEvent.type(input, "x");
    expect(input).toHaveValue("K7M2QX");
    expect(screen.getByTestId("join-code-submit")).toBeEnabled();
  });

  it("AC-24: pasted text with spaces is normalized", async () => {
    render(<JoinRoomCard onAlreadyInRoom={vi.fn()} />);
    await userEvent.click(screen.getByTestId("join-room-open-button"));
    await userEvent.click(screen.getByTestId("join-code-input"));
    await userEvent.paste(" k7m 2qx ");
    expect(screen.getByTestId("join-code-input")).toHaveValue("K7M2QX");
  });

  it("AC-22/AC-24: success → joinRoomAction({roomCode}), 'Đang vào…' locked, router.push('/room'), leave reason cleared", async () => {
    sessionStorage.setItem(LEAVE_REASON_STORAGE_KEY, "{}");
    let resolve!: (v: unknown) => void;
    mocks.joinRoomAction.mockReturnValue(new Promise((r) => (resolve = r)));
    await openAndType("k7m2qx");
    await userEvent.click(screen.getByTestId("join-code-submit"));
    expect(mocks.joinRoomAction).toHaveBeenCalledWith({ roomCode: "K7M2QX" });
    await waitFor(() => expect(screen.getByTestId("join-code-submit")).toHaveTextContent(dict.home.joining));
    expect(screen.getByTestId("join-code-input")).toBeDisabled();
    resolve({ ok: true, data: { roomId: "r1", alreadyMember: false } });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/room"));
    expect(sessionStorage.getItem(LEAVE_REASON_STORAGE_KEY)).toBeNull();
  });

  it.each([
    ["ROOM_CODE_INVALID", dict.error.ROOM_CODE_INVALID],
    ["ROOM_FULL", dict.error.ROOM_FULL],
    ["BLOCKED_FROM_ROOM", dict.error.BLOCKED_FROM_ROOM],
    ["INTERNAL_ERROR", dict.join.joinFailed],
  ])("AC-24: %s → inline error under the field, dialog stays open", async (code, message) => {
    mocks.joinRoomAction.mockResolvedValue(fail(code));
    await openAndType("K7M2QX");
    await userEvent.click(screen.getByTestId("join-code-submit"));
    expect(await screen.findByTestId("join-code-error")).toHaveTextContent(message);
    expect(screen.getByTestId("join-code-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("join-code-input")).toBeEnabled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("AC-24: thrown (network) error → 'Không vào được phòng, thử lại'; editing clears the error", async () => {
    mocks.joinRoomAction.mockRejectedValue(new Error("network"));
    await openAndType("K7M2QX");
    await userEvent.click(screen.getByTestId("join-code-submit"));
    expect(await screen.findByTestId("join-code-error")).toHaveTextContent(dict.join.joinFailed);
    await userEvent.type(screen.getByTestId("join-code-input"), "{Backspace}");
    expect(screen.queryByTestId("join-code-error")).not.toBeInTheDocument();
  });

  it("AC-24: ALREADY_IN_ROOM → dialog closes and onAlreadyInRoom(currentRoomId)", async () => {
    mocks.joinRoomAction.mockResolvedValue(fail("ALREADY_IN_ROOM", [{ code: "current_room", currentRoomId: "r_old" }]));
    const onAlready = await openAndType("K7M2QX");
    await userEvent.click(screen.getByTestId("join-code-submit"));
    await waitFor(() => expect(onAlready).toHaveBeenCalledWith("r_old"));
    await waitFor(() => expect(screen.queryByTestId("join-code-dialog")).not.toBeInTheDocument());
  });

  it("AC-24: UNAUTHENTICATED → router.replace('/login')", async () => {
    mocks.joinRoomAction.mockResolvedValue(fail("UNAUTHENTICATED"));
    await openAndType("K7M2QX");
    await userEvent.click(screen.getByTestId("join-code-submit"));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });
});
