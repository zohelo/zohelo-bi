import { describe, expect, it } from "vitest";
import { changePrev, index, latest, rank, share, yoy, type Point } from "./index";

const series = (values: (number | null)[], start = 2020): Point[] => values.map((value, i) => ({ period: String(start + i), value }));
const values = (points: Point[]) => points.map((p) => p.value);

describe("latest", () => {
  it("returns the last point with a value", () => {
    expect(latest(series([1, 2, null]))).toEqual({ period: "2021", value: 2 });
  });
  it("is null when every value is null", () => {
    expect(latest(series([null, null]))).toBeNull();
    expect(latest([])).toBeNull();
  });
});

describe("changePrev", () => {
  it("subtracts the previous value; the first point is null", () => {
    expect(values(changePrev(series([1, 4, 2])))).toEqual([null, 3, -2]);
  });
  it("is null when either value is null", () => {
    expect(values(changePrev(series([1, null, 2])))).toEqual([null, null, null]);
  });
});

describe("yoy", () => {
  it("uses 1 point back for annual data", () => {
    expect(values(yoy(series([100, 110, 99]), "A"))).toEqual([null, 10, -10]);
  });
  it("uses 4 points back for quarterly and 12 for monthly data", () => {
    expect(values(yoy(series([50, 1, 1, 1, 75]), "Q"))[4]).toBe(50);
    const monthly = series([...Array(12).fill(1), 2]);
    expect(values(yoy(monthly, "M"))).toEqual([...Array(12).fill(null), 100]);
  });
  it("matches the same date one year earlier for daily data", () => {
    const daily: Point[] = [
      { period: "2023-03-01", value: 4 },
      { period: "2024-02-29", value: 9 },
      { period: "2024-03-01", value: 5 },
    ];
    expect(values(yoy(daily, "D"))).toEqual([null, null, 25]);
  });
  it("is null when the lag value is 0 or null", () => {
    expect(values(yoy(series([0, 5, null, 7]), "A"))).toEqual([null, null, null, null]);
  });
});

describe("index", () => {
  it("divides by the base period's value", () => {
    expect(values(index(series([50, 100, 75]), "2021"))).toEqual([50, 100, 75]);
  });
  it("is all null when the base is missing or 0", () => {
    expect(values(index(series([50, 100]), "1999"))).toEqual([null, null]);
    expect(values(index(series([0, 100]), "2020"))).toEqual([null, null]);
  });
  it("keeps null values null", () => {
    expect(values(index(series([50, null]), "2020"))).toEqual([100, null]);
  });
});

describe("share", () => {
  it("divides by the total member", () => {
    expect(share({ PL: 25, CZ: null, _T: 50 })).toEqual({ PL: 50, CZ: null, _T: 100 });
  });
  it("accepts another total key", () => {
    expect(share({ PL: 1, EU27: 4 }, "EU27")).toEqual({ PL: 25, EU27: 100 });
  });
  it("is null without a total or with a zero total", () => {
    expect(share({ PL: 25 })).toEqual({ PL: null });
    expect(share({ PL: 25, _T: 0 })).toEqual({ PL: null, _T: null });
  });
});

describe("rank", () => {
  it("ranks the largest first, ties share the lower rank and nulls stay unranked", () => {
    expect(rank({ a: 5, b: 9, c: 5, d: null, e: 1 })).toEqual({ a: 2, b: 1, c: 2, d: null, e: 4 });
  });
  it("ranks zero like any other value", () => {
    expect(rank({ a: 0, b: -1 })).toEqual({ a: 1, b: 2 });
  });
});
