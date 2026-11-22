// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useMarks } from "./use-marks";

function fakeStorage() {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("useMarks", () => {
  afterEach(cleanup);

  it("toggle updates marks and persists", () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useMarks("g1", "red_a", storage));
    expect([...result.current.marks]).toEqual([]);
    act(() => result.current.toggle(12));
    expect(result.current.marks.has(12)).toBe(true);
    expect(JSON.parse(storage.data.get("g1:red_a")!)).toEqual([12]);
    act(() => result.current.toggle(12));
    expect(result.current.marks.size).toBe(0);
  });

  it("restores from storage on mount", () => {
    const storage = fakeStorage();
    storage.data.set("g1:red_a", "[4,9]");
    const { result } = renderHook(() => useMarks("g1", "red_a", storage));
    expect([...result.current.marks]).toEqual([4, 9]);
  });

  it("no gameId → empty and toggle is a no-op", () => {
    const storage = fakeStorage();
    const { result } = renderHook(() => useMarks(null, "red_a", storage));
    act(() => result.current.toggle(1));
    expect(result.current.marks.size).toBe(0);
    expect(storage.data.size).toBe(0);
  });
});
