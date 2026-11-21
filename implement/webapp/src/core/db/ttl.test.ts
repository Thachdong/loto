import { describe, expect, it } from "vitest";
import { expireAtFrom, RETENTION_MS } from "./ttl";

describe("expireAtFrom", () => {
  it("AC-18: created_at + 31 days", () => {
    const created = new Date("2026-11-21T10:00:00Z");
    expect(expireAtFrom(created).toISOString()).toBe("2026-12-22T10:00:00.000Z");
    expect(RETENTION_MS).toBe(31 * 86_400_000);
  });
});
