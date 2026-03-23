import { describe, expect, it } from "vitest";

import {
  buildTickIndexLookup,
  findClosestNumericTickIndex,
  lowerBoundNumericTick,
  resolveTickIndexFromRawValue,
} from "./numberTickIndex";

describe("numberTickIndex", () => {
  it("buildTickIndexLookup builds key/label index map and sorted numeric ticks", () => {
    const lookup = buildTickIndexLookup([
      { key: "k-0", label: "10" },
      { key: "k-1", label: "2" },
      { key: "k-2", label: "abc" },
    ]);

    expect(lookup.indexByKey.get("string:k-0")).toBe(0);
    expect(lookup.indexByKey.get("string:2")).toBe(1);
    expect(lookup.numericTicks).toEqual([
      { value: 2, index: 1 },
      { value: 10, index: 0 },
    ]);
  });

  it("lowerBoundNumericTick returns insert position", () => {
    const entries = [
      { value: 1, index: 0 },
      { value: 5, index: 1 },
      { value: 10, index: 2 },
    ];
    expect(lowerBoundNumericTick(entries, 0)).toBe(0);
    expect(lowerBoundNumericTick(entries, 5)).toBe(1);
    expect(lowerBoundNumericTick(entries, 7)).toBe(2);
    expect(lowerBoundNumericTick(entries, 99)).toBe(3);
  });

  it("findClosestNumericTickIndex picks nearest and prefers lower on tie", () => {
    const entries = [
      { value: 0, index: 0 },
      { value: 10, index: 1 },
      { value: 20, index: 2 },
    ];
    expect(findClosestNumericTickIndex(entries, 1)).toBe(0);
    expect(findClosestNumericTickIndex(entries, 19)).toBe(2);
    expect(findClosestNumericTickIndex(entries, 15)).toBe(1);
    expect(findClosestNumericTickIndex([], 7)).toBeNull();
  });

  it("resolveTickIndexFromRawValue resolves by lookup key, numeric nearest, and fallback rounding", () => {
    const lookupWithNumeric = buildTickIndexLookup([
      { key: "left", label: "0" },
      { key: "right", label: "10" },
    ]);
    expect(
      resolveTickIndexFromRawValue("left", lookupWithNumeric, 1, "round")
    ).toBe(0);
    expect(resolveTickIndexFromRawValue(7, lookupWithNumeric, 1, "round")).toBe(
      1
    );

    const lookupWithoutNumeric = buildTickIndexLookup([
      { key: "a", label: "x" },
      { key: "b", label: "y" },
    ]);
    expect(
      resolveTickIndexFromRawValue(0.2, lookupWithoutNumeric, 1, "floor")
    ).toBe(0);
    expect(
      resolveTickIndexFromRawValue(8.9, lookupWithoutNumeric, 1, "round")
    ).toBe(1);
    expect(resolveTickIndexFromRawValue(null, lookupWithoutNumeric, 1, "round")).toBeNull();
  });
});
