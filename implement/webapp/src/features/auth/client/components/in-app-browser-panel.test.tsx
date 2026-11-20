// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { InAppBrowserPanel } from "./in-app-browser-panel";

const toastMock = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMock }));

const CURRENT_URL = "https://loto.example.com/login?returnTo=%2Fjoin%2FAAAAAAAAAAAAAAAAAAAAAA";

function mockClipboard(writeText: ReturnType<typeof vi.fn> | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

describe("InAppBrowserPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    cleanup();
    mockClipboard(undefined);
  });

  it("AC-14: shows title and 2 steps", () => {
    render(<InAppBrowserPanel android={false} currentUrl={CURRENT_URL} />);
    const panel = screen.getByTestId("inapp-panel");
    expect(panel).toHaveTextContent(dict.login.inApp.title);
    expect(panel).toHaveTextContent(dict.login.inApp.step1);
    expect(panel).toHaveTextContent(dict.login.inApp.step2);
    expect(screen.getByTestId("inapp-copy-link")).toHaveTextContent(dict.login.inApp.copyLink);
  });

  it("AC-14: Android → 'Mở bằng Chrome' with intent URL keeping returnTo", () => {
    render(<InAppBrowserPanel android currentUrl={CURRENT_URL} />);
    const link = screen.getByTestId("inapp-open-chrome");
    expect(link).toHaveTextContent(dict.login.inApp.openChrome);
    expect(link).toHaveAttribute(
      "href",
      "intent://loto.example.com/login?returnTo=%2Fjoin%2FAAAAAAAAAAAAAAAAAAAAAA#Intent;scheme=https;package=com.android.chrome;end",
    );
  });

  it("AC-14: not Android → no 'Mở bằng Chrome'", () => {
    render(<InAppBrowserPanel android={false} currentUrl={CURRENT_URL} />);
    expect(screen.queryByTestId("inapp-open-chrome")).not.toBeInTheDocument();
  });

  it("AC-15: clipboard ok → writes current URL and toasts", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    render(<InAppBrowserPanel android={false} currentUrl={CURRENT_URL} />);
    mockClipboard(writeText);
    await userEvent.click(screen.getByTestId("inapp-copy-link"));

    expect(writeText).toHaveBeenCalledWith(CURRENT_URL);
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith(dict.login.inApp.copied));
    expect(screen.queryByTestId("inapp-link-input")).not.toBeInTheDocument();
  });

  it("AC-16: clipboard rejected → readonly input with link, fully selected", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    render(<InAppBrowserPanel android={false} currentUrl={CURRENT_URL} />);
    mockClipboard(writeText);
    await userEvent.click(screen.getByTestId("inapp-copy-link"));

    const input = (await screen.findByTestId("inapp-link-input")) as HTMLInputElement;
    expect(input).toHaveAttribute("readonly");
    expect(input.value).toBe(CURRENT_URL);
    expect(screen.getByText(dict.login.inApp.copyManual)).toBeInTheDocument();
    await waitFor(() => {
      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(CURRENT_URL.length);
    });
    expect(toastMock.success).not.toHaveBeenCalled();
  });

  it("AC-16: no Clipboard API → readonly input shown", async () => {
    render(<InAppBrowserPanel android={false} currentUrl={CURRENT_URL} />);
    mockClipboard(undefined);
    await userEvent.click(screen.getByTestId("inapp-copy-link"));
    expect(await screen.findByTestId("inapp-link-input")).toHaveValue(CURRENT_URL);
  });
});
