import { describe, expect, it } from "vitest";
import { charCount, defaultRoomName, resolveRoomName } from "./room-name";

describe("resolveRoomName", () => {
  it("AC-6: no name → 'Phòng của {display_name}'", () => {
    expect(resolveRoomName(undefined, "An Nguyễn")).toBe("Phòng của An Nguyễn");
  });

  it("trims the given name", () => {
    expect(resolveRoomName("  Lô tô Tết  ", "An")).toBe("Lô tô Tết");
  });

  it("AC-7: blank or > 50 characters → null", () => {
    expect(resolveRoomName("   ", "An")).toBeNull();
    expect(resolveRoomName("", "An")).toBeNull();
    expect(resolveRoomName("a".repeat(51), "An")).toBeNull();
  });

  it("accepts exactly 50 characters, counted as Unicode code points", () => {
    expect(resolveRoomName("a".repeat(50), "An")).toBe("a".repeat(50));
    const emoji = "🎉".repeat(50); // 100 UTF-16 code units, 50 ký tự
    expect(resolveRoomName(emoji, "An")).toBe(emoji);
    expect(resolveRoomName("🎉".repeat(51), "An")).toBeNull();
  });

  it("default name is cut to 50 characters for long display names", () => {
    const name = defaultRoomName("x".repeat(60));
    expect(charCount(name)).toBe(50);
    expect(name.startsWith("Phòng của x")).toBe(true);
  });
});
