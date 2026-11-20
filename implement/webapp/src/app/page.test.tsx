// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vi as dict } from "@/core/shared/i18n/vi";
import HomePage from "./page";

describe("HomePage", () => {
  it("AC-9: renders title and tagline from vi.ts", () => {
    render(<HomePage />);
    expect(screen.getByTestId("app-title")).toHaveTextContent(dict.app.name);
    expect(screen.getByTestId("app-tagline")).toHaveTextContent(dict.app.tagline);
  });
});
