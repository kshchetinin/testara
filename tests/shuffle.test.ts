import { describe, expect, it } from "vitest";
import { seededShuffle } from "@/lib/shuffle";

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h"];

  it("is deterministic for the same seed", () => {
    expect(seededShuffle(items, "attempt-1:question-1")).toEqual(seededShuffle(items, "attempt-1:question-1"));
  });

  it("produces a different order for a different seed (with high probability)", () => {
    const a = seededShuffle(items, "attempt-1:question-1");
    const b = seededShuffle(items, "attempt-2:question-1");
    expect(a).not.toEqual(b);
  });

  it("preserves the original set of elements", () => {
    const shuffled = seededShuffle(items, "seed");
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("does not mutate the input array", () => {
    const copy = [...items];
    seededShuffle(items, "seed");
    expect(items).toEqual(copy);
  });
});
