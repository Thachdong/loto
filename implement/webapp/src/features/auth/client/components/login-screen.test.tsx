// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import type { Me } from "@/features/auth/shared/types";
import { LoginScreen } from "./login-screen";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  createSessionAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/core/client/firebase", () => ({ getClientAuth: () => ({ name: "auth" }) }));
vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {},
  signInWithPopup: mocks.signInWithPopup,
  signInWithRedirect: mocks.signInWithRedirect,
  getRedirectResult: mocks.getRedirectResult,
}));
vi.mock("@/features/auth/server/actions/create-session.action", () => ({
  createSessionAction: mocks.createSessionAction,
}));

const JOIN = "/join/AAAAAAAAAAAAAAAAAAAAAA";
const URL_NOW = `http://localhost:3000/login?returnTo=${encodeURIComponent(JOIN)}`;

const me = (currentRoomId: string | null): Me => ({
  uid: "u_an",
  email: "an@example.com",
  displayName: "An Nguyễn",
  photoUrl: null,
  googleName: "An Nguyễn",
  googlePhotoUrl: null,
  profileCustomized: false,
  currentRoomId,
});
const user = { getIdToken: vi.fn(async () => "id-token") };

function renderScreen(props: Partial<Parameters<typeof LoginScreen>[0]> = {}) {
  return render(
    <LoginScreen returnTo={null} inApp={false} android={false} mobile={false} currentUrl={URL_NOW} {...props} />,
  );
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("LoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  it("AC-1: shows app name, Google button and data note; no banner without returnTo", () => {
    renderScreen();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(dict.app.name);
    expect(screen.getByTestId("login-google-button")).toHaveTextContent(dict.login.signInWithGoogle);
    expect(screen.getByTestId("login-google-button")).toBeEnabled();
    expect(screen.getByTestId("login-data-note")).toHaveTextContent(dict.login.dataNote);
    expect(screen.queryByTestId("login-invite-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("login-error")).not.toBeInTheDocument();
  });

  it("AC-8: shows invite banner when returnTo is present", () => {
    renderScreen({ returnTo: JOIN });
    expect(screen.getByTestId("login-invite-banner")).toHaveTextContent(dict.login.inviteBanner);
  });

  it("AC-3: while popup is pending, button shows 'Đang đăng nhập…' and is disabled", async () => {
    const popup = deferred<unknown>();
    mocks.signInWithPopup.mockReturnValue(popup.promise);
    renderScreen();
    await userEvent.click(screen.getByTestId("login-google-button"));

    const button = screen.getByTestId("login-google-button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(dict.login.signingIn);
    expect(button.querySelector("svg.animate-spin")).not.toBeNull();
    await act(async () => popup.reject(new Error("x")));
  });

  it("AC-10: popup closed → error line, button clickable again, banner kept", async () => {
    mocks.signInWithPopup.mockRejectedValue(Object.assign(new Error("closed"), { code: "auth/popup-closed-by-user" }));
    renderScreen({ returnTo: JOIN });
    await userEvent.click(screen.getByTestId("login-google-button"));

    expect(await screen.findByTestId("login-error")).toHaveTextContent(dict.login.error);
    expect(screen.getByRole("alert")).toBe(screen.getByTestId("login-error"));
    const button = screen.getByTestId("login-google-button");
    expect(button).toBeEnabled();
    expect(button).toHaveTextContent(dict.login.signInWithGoogle);
    expect(screen.getByTestId("login-invite-banner")).toBeInTheDocument();
    expect(mocks.createSessionAction).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();

    mocks.signInWithPopup.mockResolvedValueOnce({ user });
    mocks.createSessionAction.mockResolvedValueOnce({ ok: true, data: { me: me(null), isNewUser: false } });
    await userEvent.click(button);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(JOIN));
  });

  it("AC-11: action ok:false → error line", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user });
    mocks.createSessionAction.mockResolvedValue({
      ok: false,
      error: { code: "GOOGLE_TOKEN_INVALID", message: dict.error.GOOGLE_TOKEN_INVALID },
    });
    renderScreen();
    await userEvent.click(screen.getByTestId("login-google-button"));

    expect(await screen.findByTestId("login-error")).toHaveTextContent(dict.login.error);
    expect(screen.getByTestId("login-google-button")).toBeEnabled();
    expect(mocks.createSessionAction).toHaveBeenCalledWith({ idToken: "id-token" });
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("AC-7: success while in a room → /room, button stays loading", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user });
    mocks.createSessionAction.mockResolvedValue({ ok: true, data: { me: me("r_seed"), isNewUser: false } });
    renderScreen();
    await userEvent.click(screen.getByTestId("login-google-button"));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/room"));
    expect(screen.getByTestId("login-google-button")).toBeDisabled();
    expect(mocks.signInWithRedirect).not.toHaveBeenCalled();
  });

  it("AC-9: invalid returnTo is never followed", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user });
    mocks.createSessionAction.mockResolvedValue({ ok: true, data: { me: me(null), isNewUser: true } });
    renderScreen({ returnTo: "https://evil.com" });
    await userEvent.click(screen.getByTestId("login-google-button"));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
  });

  it("mobile: uses redirect; while checking redirect result the button is loading (AC-3)", async () => {
    const redirect = deferred<unknown>();
    mocks.getRedirectResult.mockReturnValue(redirect.promise);
    renderScreen({ mobile: true });

    const button = screen.getByTestId("login-google-button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(dict.login.signingIn);

    await act(async () => redirect.resolve(null));
    expect(button).toBeEnabled();

    mocks.signInWithRedirect.mockReturnValue(new Promise(() => {}));
    await userEvent.click(button);
    expect(mocks.signInWithRedirect).toHaveBeenCalledTimes(1);
    expect(mocks.signInWithPopup).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it("mobile: redirect result with user → creates session and navigates", async () => {
    mocks.getRedirectResult.mockResolvedValue({ user });
    mocks.createSessionAction.mockResolvedValue({ ok: true, data: { me: me(null), isNewUser: false } });
    renderScreen({ mobile: true, returnTo: JOIN });
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(JOIN));
  });

  it("mobile: redirect result error → error line", async () => {
    mocks.getRedirectResult.mockRejectedValue(new Error("google"));
    renderScreen({ mobile: true });
    expect(await screen.findByTestId("login-error")).toBeInTheDocument();
    expect(screen.getByTestId("login-google-button")).toBeEnabled();
  });

  it("AC-14: in-app browser → panel shown, no Google button", () => {
    renderScreen({ inApp: true, android: true, mobile: true, returnTo: JOIN });
    expect(screen.getByTestId("inapp-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("login-google-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("login-invite-banner")).toBeInTheDocument();
    expect(screen.getByTestId("login-data-note")).toBeInTheDocument();
    expect(mocks.getRedirectResult).not.toHaveBeenCalled();
  });
});
