// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { clampChars, countChars, CreateRoomForm } from "./create-room-form";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createRoomAction: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
  onAlreadyInRoom: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/features/room/server/actions/create-room.action", () => ({
  createRoomAction: mocks.createRoomAction,
}));

const renderForm = () => render(<CreateRoomForm displayName="An Nguyễn" onAlreadyInRoom={mocks.onAlreadyInRoom} />);
const input = () => screen.getByTestId("room-name-input") as HTMLInputElement;
const counter = () => screen.getByTestId("room-name-counter");

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

describe("CreateRoomForm", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("counts Unicode characters, not UTF-16 units", () => {
    expect(countChars("😀🎉")).toBe(2);
    expect(countChars("Lô tô")).toBe(5);
    expect(clampChars("😀".repeat(60))).toBe("😀".repeat(50));
  });

  it("AC-7: counter tracks Unicode chars; paste of 60 chars keeps 50 and counter stops at 50/50", async () => {
    renderForm();
    expect(counter()).toHaveTextContent("0/50");
    await userEvent.type(input(), "Lô tô 🎉");
    expect(counter()).toHaveTextContent("7/50");

    await userEvent.clear(input());
    await userEvent.click(input());
    await userEvent.paste("x".repeat(60));
    expect(input().value).toBe("x".repeat(50));
    expect(counter()).toHaveTextContent("50/50");

    await userEvent.type(input(), "y");
    expect(input().value).toBe("x".repeat(50));
    expect(counter()).toHaveTextContent("50/50");

    fireEvent.change(input(), { target: { value: "🎉".repeat(55) } });
    expect(input().value).toBe("🎉".repeat(50));
    expect(counter()).toHaveTextContent("50/50");
  });

  it("AC-6: blank / spaces-only name → action called without name", async () => {
    // Không để action treo: React gộp các async transition còn dở → test sau bị kẹt pending.
    mocks.createRoomAction.mockResolvedValue({ ok: false, error: { code: "INTERNAL_ERROR", message: "x" } });
    renderForm();
    await userEvent.type(input(), "   ");
    await userEvent.click(screen.getByTestId("create-room-button"));
    expect(mocks.createRoomAction).toHaveBeenCalledWith({ voicePack: "v1" });
    await waitFor(() => expect(screen.getByTestId("create-room-button")).toBeEnabled());
  });

  it("AC-2: trims name; button locked with 'Đang tạo phòng…' while sending; push /room on success", async () => {
    const pending = deferred<unknown>();
    mocks.createRoomAction.mockReturnValue(pending.promise);
    renderForm();
    await userEvent.type(input(), "  Lô tô Tết  ");
    await userEvent.click(screen.getByTestId("create-room-button"));

    expect(mocks.createRoomAction).toHaveBeenCalledWith({ name: "Lô tô Tết", voicePack: "v1" });
    const button = screen.getByTestId("create-room-button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(dict.home.creating);

    pending.resolve({ ok: true, data: { roomId: "r1" } });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/room"));
    expect(button).toBeDisabled();
  });

  it.each(["ROOM_NAME_INVALID", "VALIDATION_FAILED"])("AC-7: %s → red error under the input, cleared on edit", async (code) => {
    mocks.createRoomAction.mockResolvedValue({ ok: false, error: { code, message: "x" } });
    renderForm();
    await userEvent.type(input(), "abc");
    await userEvent.click(screen.getByTestId("create-room-button"));

    expect(await screen.findByTestId("room-name-error")).toHaveTextContent(dict.home.roomNameInvalid);
    expect(input()).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(screen.getByTestId("create-room-button")).toBeEnabled());
    expect(mocks.toast.error).not.toHaveBeenCalled();

    await userEvent.type(input(), "d");
    expect(screen.queryByTestId("room-name-error")).not.toBeInTheDocument();
  });

  it("AC-8: ALREADY_IN_ROOM → onAlreadyInRoom(currentRoomId)", async () => {
    mocks.createRoomAction.mockResolvedValue({
      ok: false,
      error: { code: "ALREADY_IN_ROOM", message: "x", details: [{ code: "current_room", currentRoomId: "r_old" }] },
    });
    renderForm();
    await userEvent.click(screen.getByTestId("create-room-button"));
    await waitFor(() => expect(mocks.onAlreadyInRoom).toHaveBeenCalledWith("r_old"));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("other error or thrown action → toast 'Không tạo được phòng, thử lại'", async () => {
    mocks.createRoomAction.mockResolvedValueOnce({ ok: false, error: { code: "INTERNAL_ERROR", message: "x" } });
    renderForm();
    await userEvent.click(screen.getByTestId("create-room-button"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(dict.home.createFailed));
    await waitFor(() => expect(screen.getByTestId("create-room-button")).toBeEnabled());

    mocks.createRoomAction.mockRejectedValueOnce(new Error("network"));
    await userEvent.click(screen.getByTestId("create-room-button"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("create-room-button")).toBeEnabled());
  });
});
