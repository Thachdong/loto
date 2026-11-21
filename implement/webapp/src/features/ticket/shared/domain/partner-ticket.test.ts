import { describe, expect, it } from "vitest";
import { TICKET_IDS } from "@/features/ticket/shared/constants";
import { partnerOf } from "./partner-ticket";

describe("partnerOf", () => {
  it("maps a to b and b to a within the same color", () => {
    expect(partnerOf("red_a")).toBe("red_b");
    expect(partnerOf("pink_b")).toBe("pink_a");
  });

  it("is an involution over all 16 ids", () => {
    for (const id of TICKET_IDS) expect(partnerOf(partnerOf(id))).toBe(id);
  });
});
