import { describe, expect, it } from "vitest";
import { backupIndexOf, backupOrder } from "./backup-order";

describe("backupOrder", () => {
  it("drops the host and players without tickets, orders by smallest ticket in TICKET_ORDER", () => {
    const order = backupOrder(
      [
        { uid: "host", ticketIds: ["red_a"] },
        { uid: "c", ticketIds: ["blue_a", "blue_b"] },
        { uid: "b", ticketIds: ["pink_b", "red_b"] },
        { uid: "none", ticketIds: [] },
      ],
      "host",
    );
    expect(order).toEqual(["b", "c"]);
  });

  it("is independent of input order", () => {
    const a = { uid: "a", ticketIds: ["green_a"] as const };
    const b = { uid: "b", ticketIds: ["orange_b"] as const };
    expect(backupOrder([a, b], "h")).toEqual(backupOrder([b, a], "h"));
  });

  it("breaks ties by uid", () => {
    expect(backupOrder([{ uid: "z", ticketIds: ["red_a"] }, { uid: "a", ticketIds: ["red_a"] }], "h")).toEqual(["a", "z"]);
  });

  it("backupIndexOf is 1-based and null for non-backups", () => {
    expect(backupIndexOf(["b", "c"], "b")).toBe(1);
    expect(backupIndexOf(["b", "c"], "c")).toBe(2);
    expect(backupIndexOf(["b", "c"], "host")).toBeNull();
  });
});
