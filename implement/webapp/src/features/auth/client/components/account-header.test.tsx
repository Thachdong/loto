// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { AccountHeader, initialOf } from "./account-header";

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
  signOut: vi.fn(),
  deleteCurrentSessionAction: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("sonner", () => ({ toast: mocks.toast }));
vi.mock("@/core/client/firebase", () => ({ getClientAuth: () => ({ name: "auth" }) }));
vi.mock("firebase/auth", () => ({ signOut: mocks.signOut }));
vi.mock("@/features/auth/server/actions/delete-current-session.action", () => ({
  deleteCurrentSessionAction: mocks.deleteCurrentSessionAction,
}));

const UID = "u_giang";
const set = (path: string, entry: Entry) => act(() => fake.set(path, entry));
const renderHeader = (currentRoomId: string | null = null) =>
  render(<AccountHeader uid={UID} displayName="Giang" photoUrl={null} currentRoomId={currentRoomId} />);

async function openMenu() {
  await userEvent.click(screen.getByTestId("account-avatar"));
  return screen.findByTestId("account-menu");
}

describe("AccountHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.docs.clear();
  });
  afterEach(cleanup);

  it("shows logo and avatar initial when there is no photo", () => {
    renderHeader();
    expect(screen.getByTestId("account-logo")).toHaveTextContent(dict.account.logo);
    expect(screen.getByTestId("account-avatar")).toHaveAccessibleName(dict.account.menu);
    expect(screen.getByTestId("account-avatar")).toHaveTextContent("G");
    expect(initialOf("  ánh")).toBe("Á");
    expect(initialOf("")).toBe("?");
  });

  it("AC-14: not in a room → menu has 'Đăng xuất'; click → action, Firebase signOut, /login", async () => {
    set(`users/${UID}`, { status: "ready", raw: { display_name: "Giang", photo_url: null, current_room_id: null } });
    mocks.deleteCurrentSessionAction.mockResolvedValue({ ok: true, data: null });
    mocks.signOut.mockResolvedValue(undefined);
    renderHeader();
    await openMenu();
    const item = screen.getByTestId("sign-out-item");
    expect(item).toHaveTextContent(dict.account.signOut);
    expect(screen.queryByText("Hồ sơ cá nhân")).not.toBeInTheDocument();

    await userEvent.click(item);
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(mocks.deleteCurrentSessionAction).toHaveBeenCalledWith({});
    expect(mocks.signOut).toHaveBeenCalledWith({ name: "auth" });
  });

  it("AC-14: UNAUTHENTICATED is treated as success", async () => {
    mocks.deleteCurrentSessionAction.mockResolvedValue({
      ok: false,
      error: { code: "UNAUTHENTICATED", message: dict.error.UNAUTHENTICATED },
    });
    renderHeader();
    await openMenu();
    await userEvent.click(screen.getByTestId("sign-out-item"));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
    expect(mocks.signOut).toHaveBeenCalled();
  });

  it("other error → toast, stays on page", async () => {
    mocks.deleteCurrentSessionAction.mockResolvedValue({
      ok: false,
      error: { code: "INTERNAL_ERROR", message: dict.error.INTERNAL_ERROR },
    });
    renderHeader();
    await openMenu();
    await userEvent.click(screen.getByTestId("sign-out-item"));
    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(dict.error.INTERNAL_ERROR));
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("AC-16: in a room (live users doc) → menu has no 'Đăng xuất'", async () => {
    renderHeader(null);
    set(`users/${UID}`, { status: "ready", raw: { display_name: "Giang", photo_url: null, current_room_id: "r1" } });
    await openMenu();
    expect(screen.queryByTestId("sign-out-item")).not.toBeInTheDocument();
    expect(screen.queryByText(dict.account.signOut)).not.toBeInTheDocument();
  });

  it("AC-16: server says in a room before listener answers → no 'Đăng xuất'", async () => {
    renderHeader("r1");
    await openMenu();
    expect(screen.queryByTestId("sign-out-item")).not.toBeInTheDocument();
  });
});
