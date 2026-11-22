import { describe, expect, it } from "vitest";
import { createMarksStore } from "./marks-store";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe("marksStore", () => {
  it("toggle marks and unmarks, persisting under {gameId}:{ticketId}", () => {
    const s = fakeStorage();
    const store = createMarksStore(s);
    expect(store.toggle("g1", "red_a", 7)).toEqual([7]);
    expect(store.toggle("g1", "red_a", 3)).toEqual([3, 7]);
    expect(JSON.parse(s.data.get("g1:red_a")!)).toEqual([3, 7]);
    expect(store.toggle("g1", "red_a", 7)).toEqual([3]);
  });

  it("restores after reload (new store, same storage)", () => {
    const s = fakeStorage();
    createMarksStore(s).write("g1", "red_a", [5, 9]);
    expect(createMarksStore(s).read("g1", "red_a")).toEqual([5, 9]);
  });

  it("isolates games and tickets", () => {
    const store = createMarksStore(fakeStorage());
    store.toggle("g1", "red_a", 1);
    expect(store.read("g2", "red_a")).toEqual([]);
    expect(store.read("g1", "red_b")).toEqual([]);
  });

  it("corrupt JSON → empty", () => {
    const s = fakeStorage();
    s.data.set("g1:red_a", "{oops");
    expect(createMarksStore(s).read("g1", "red_a")).toEqual([]);
    s.data.set("g1:red_b", JSON.stringify([1, "x", 200, 4]));
    expect(createMarksStore(s).read("g1", "red_b")).toEqual([1, 4]);
  });

  it("null / throwing storage keeps marks in memory", () => {
    const mem = createMarksStore(null);
    mem.toggle("g", "t", 4);
    expect(mem.read("g", "t")).toEqual([4]);
    const throwing = createMarksStore({
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    });
    expect(throwing.toggle("g", "t", 8)).toEqual([8]);
    expect(throwing.read("g", "t")).toEqual([8]);
  });

  it("notifies subscribers after a write until unsubscribed", () => {
    const store = createMarksStore(null);
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.toggle("g", "t", 1);
    expect(calls).toBe(1);
    off();
    store.toggle("g", "t", 2);
    expect(calls).toBe(1);
  });
});
