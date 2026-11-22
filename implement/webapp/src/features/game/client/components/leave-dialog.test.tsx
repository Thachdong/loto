// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { LeaveDialog, leaveVariant, type LeaveVariant } from "./leave-dialog";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/features/room/server/actions/leave-room.action", () => ({ leaveRoomAction: vi.fn() }));

describe("leaveVariant", () => {
  it("host always host; player depends on live game and tickets", () => {
    expect(leaveVariant(true, "waiting", 0)).toBe("host");
    expect(leaveVariant(false, "waiting", 2)).toBe("simple");
    expect(leaveVariant(false, "running", 0)).toBe("simple");
    expect(leaveVariant(false, "running", 1)).toBe("playing");
    expect(leaveVariant(false, "awaiting_confirm", 1)).toBe("playing");
    expect(leaveVariant(false, "finished", 1)).toBe("simple");
  });
});

describe("LeaveDialog", () => {
  beforeEach(() => {
    sessionStorage.clear();
    toast.error.mockClear();
  });
  afterEach(cleanup);

  function setup(variant: LeaveVariant, leave = vi.fn().mockResolvedValue({ ok: true, data: null })) {
    const props = { onStay: vi.fn(), onBeforeLeave: vi.fn().mockResolvedValue(undefined), onAbort: vi.fn(), onLeft: vi.fn(), leave };
    render(<LeaveDialog open variant={variant} roomId="r1" roomName="Tết" {...props} />);
    return { ...props, leave };
  }

  it.each([
    ["simple", dict.leaveDialog.title, dict.leaveDialog.bodySimple, dict.leaveDialog.confirm],
    ["playing", dict.leaveDialog.title, dict.leaveDialog.bodyPlaying, dict.leaveDialog.confirm],
    ["host", dict.leaveDialog.hostTitle, dict.leaveDialog.hostBody, dict.leaveDialog.confirmHost],
  ] as const)("variant %s shows the right copy", (variant, title, body, confirm) => {
    setup(variant);
    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByTestId("leave-body")).toHaveTextContent(body);
    expect(screen.getByTestId("btn-leave-confirm")).toHaveTextContent(confirm);
  });

  it("Ở lại calls onStay without leaving", async () => {
    const p = setup("simple");
    await userEvent.click(screen.getByTestId("btn-leave-stay"));
    expect(p.onStay).toHaveBeenCalled();
    expect(p.leave).not.toHaveBeenCalled();
  });

  it("player confirm: before-leave hook, action, then writes reason left and goes home", async () => {
    const order: string[] = [];
    const leave = vi.fn(async () => (order.push("action"), { ok: true as const, data: null }));
    const p = setup("playing", leave);
    p.onBeforeLeave.mockImplementation(async () => void order.push("before"));
    await userEvent.click(screen.getByTestId("btn-leave-confirm"));
    expect(order).toEqual(["before", "action"]);
    expect(JSON.parse(sessionStorage.getItem("loto:leaveReason") ?? "{}")).toEqual({ reason: "left", roomName: "Tết" });
    expect(p.onLeft).toHaveBeenCalled();
  });

  it("host confirm does not write a leave reason (flow infers host_left)", async () => {
    const p = setup("host");
    await userEvent.click(screen.getByTestId("btn-leave-confirm"));
    expect(sessionStorage.getItem("loto:leaveReason")).toBeNull();
    expect(p.onLeft).toHaveBeenCalled();
  });

  it("failure → toast, abort callback, button enabled again", async () => {
    const leave = vi.fn().mockResolvedValue({ ok: false, error: { code: "INTERNAL_ERROR", message: "x" } });
    const p = setup("simple", leave);
    await userEvent.click(screen.getByTestId("btn-leave-confirm"));
    expect(toast.error).toHaveBeenCalledWith(dict.leaveDialog.failed);
    expect(p.onAbort).toHaveBeenCalled();
    expect(p.onLeft).not.toHaveBeenCalled();
    expect(screen.getByTestId("btn-leave-confirm")).toBeEnabled();
  });
});
