// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import { JoinError } from "./join-error";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("JoinError", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it.each([
    ["invalid", dict.join.errorTitleInvalid],
    ["full", dict.join.errorTitleFull],
    ["blocked", dict.join.errorTitleBlocked],
    ["load", dict.join.errorTitleLoad],
  ] as const)("AC-9/AC-10/AC-13/AC-21: variant %s shows its title and no retry unless load", (variant, title) => {
    render(<JoinError variant={variant} signedIn />);
    expect(screen.getByTestId("join-error-title")).toHaveTextContent(title);
    expect(screen.getByTestId("join-error-home")).toHaveTextContent(dict.join.backHome);
    expect(!!screen.queryByTestId("join-error-retry")).toBe(variant === "load");
  });

  it("AC-9: Về trang chủ → '/' when signed in, '/login' when not", () => {
    const { rerender } = render(<JoinError variant="invalid" signedIn />);
    expect(screen.getByTestId("join-error-home")).toHaveAttribute("href", "/");
    rerender(<JoinError variant="invalid" signedIn={false} />);
    expect(screen.getByTestId("join-error-home")).toHaveAttribute("href", "/login");
  });

  it("AC-21: Thử lại reloads the page data (router.refresh)", async () => {
    render(<JoinError variant="load" signedIn={false} />);
    await userEvent.click(screen.getByTestId("join-error-retry"));
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
