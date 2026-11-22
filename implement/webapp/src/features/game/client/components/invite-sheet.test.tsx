// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { formatExpiryTime, InviteSheet, spacedCode } from "./invite-sheet";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const room = { name: "Tết", inviteCode: "abcINV", joinCode: "K7M2QX", memberCount: 3, expiresAt: new Date("2026-01-01T05:30:00Z") };

describe("helpers", () => {
  it("formats HH:mm in GMT+7 and spaces the code", () => {
    expect(formatExpiryTime(room.expiresAt)).toBe("12:30");
    expect(spacedCode("K7M2QX")).toBe("K7M 2QX");
  });
});

describe("InviteSheet", () => {
  beforeEach(() => {
    toast.mockClear();
    toast.error.mockClear();
  });
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(navigator, "share");
  });

  const open = () => render(<InviteSheet open onClose={vi.fn()} room={room} bottom={120} origin="https://lo.to" />);

  it("shows link, spaced code and expiry line", () => {
    open();
    expect(screen.getByTestId("invite-link")).toHaveValue("https://lo.to/join/abcINV");
    expect(screen.getByTestId("invite-code")).toHaveTextContent("K7M 2QX");
    expect(screen.getByTestId("invite-expires")).toHaveTextContent("12:30");
    expect(screen.getByTestId("invite-expires")).toHaveTextContent("3/16");
  });

  it("copies link and code with toasts", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    open();
    await userEvent.click(screen.getByTestId("btn-copy-link"));
    expect(writeText).toHaveBeenLastCalledWith("https://lo.to/join/abcINV");
    expect(toast).toHaveBeenLastCalledWith(dict.inviteSheet.linkCopied);
    await userEvent.click(screen.getByTestId("btn-copy-code"));
    expect(writeText).toHaveBeenLastCalledWith("K7M2QX");
    expect(toast).toHaveBeenLastCalledWith(dict.inviteSheet.codeCopied);
  });

  it("clipboard failure → error toast", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("no")) }, configurable: true });
    open();
    await userEvent.click(screen.getByTestId("btn-copy-link"));
    expect(toast.error).toHaveBeenCalledWith(dict.inviteSheet.copyFailed);
  });

  it("share button hidden without Web Share; shares link + code when present", async () => {
    open();
    expect(screen.queryByTestId("btn-share")).toBeNull();
    cleanup();
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    open();
    await userEvent.click(screen.getByTestId("btn-share"));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: "https://lo.to/join/abcINV", text: expect.stringContaining("K7M2QX") }));
  });
});
