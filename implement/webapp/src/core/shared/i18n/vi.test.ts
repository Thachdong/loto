import { describe, expect, it } from "vitest";
import { interpolate, t, type I18nKey } from "./vi";

describe("t", () => {
  it("returns the string for a key", () => {
    expect(t("app.name")).toBe("Lô Tô Online");
    expect(t("error.ROOM_FULL")).toBe("Phòng đã đầy");
  });

  it("replaces params and keeps unknown placeholders", () => {
    expect(interpolate("Xin chào {name}, còn {n} vé", { name: "An", n: 2 })).toBe(
      "Xin chào An, còn 2 vé",
    );
    expect(interpolate("Còn {n} vé {unknown}", { n: 0 })).toBe("Còn 0 vé {unknown}");
    expect(t("app.name", { x: 1 })).toBe("Lô Tô Online");
  });

  it("returns the key itself when missing", () => {
    expect(t("app.missing" as I18nKey)).toBe("app.missing");
  });
});
