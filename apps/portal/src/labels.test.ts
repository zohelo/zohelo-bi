import { describe, expect, it } from "vitest";
import { decimalsOf, formatNumber } from "./labels";

describe("formatNumber", () => {
  it("writes numbers in the page language with a true minus", () => {
    expect(formatNumber(37_490_000, "pl")).toBe("37 490 000");
    expect(formatNumber(37_490_000, "en")).toBe("37,490,000");
    expect(formatNumber(-150_000, "pl")).toBe("−150 000");
    expect(formatNumber(3.5, "pl")).toBe("3,5");
    expect(formatNumber(3.5)).toBe("3.5");
    expect(formatNumber(null, "pl")).toBe("–");
  });

  it("fixes the decimals when given a series precision", () => {
    expect(formatNumber(4, "pl", 1)).toBe("4,0");
    expect(formatNumber(3.9, "pl", 1)).toBe("3,9");
    expect(formatNumber(4, "en", 1)).toBe("4.0");
  });
});

describe("decimalsOf", () => {
  it("is the most decimals a value of the series needs, at most 2, none from 100", () => {
    expect(decimalsOf([4, 3.9, null])).toBe(1);
    expect(decimalsOf([4, 5])).toBe(0);
    expect(decimalsOf([0.125, 1])).toBe(2);
    expect(decimalsOf([37_490_000.5, 120])).toBe(0);
    expect(decimalsOf([3.2 - 2.9])).toBe(1);
    expect(decimalsOf([])).toBe(0);
  });
});
