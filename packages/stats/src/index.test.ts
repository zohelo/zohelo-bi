import { describe, expect, it } from "vitest";
import {
  betaConvergence,
  change,
  correlation,
  crossCorrelation,
  decompose,
  dispersion,
  forecast,
  ols,
  quantile,
  tPValue,
  trend,
} from "./index";

describe("basics and least squares", () => {
  it("quantiles, changes and the t distribution", () => {
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(change([100, 110, 121], 1, true).map((v) => v && Math.round(v * 1e6) / 1e6)).toEqual([null, 10, 10]);
    expect(change([5, 7, 4], 1, false)).toEqual([null, 2, -3]);
    // Textbook values: t = 2.228 with 10 df is the 5% two-sided point; t = 1.96 with many df too.
    expect(tPValue(2.228, 10)).toBeCloseTo(0.05, 3);
    expect(tPValue(1.96, 100000)).toBeCloseTo(0.05, 3);
    expect(tPValue(0, 5)).toBeCloseTo(1, 6);
  });
  it("fits a line and reports how sure the slope is", () => {
    const f = ols([1, 2, 3, 4, 5], [2.1, 3.9, 6.2, 7.8, 10.1])!;
    expect(f.slope).toBeCloseTo(1.99, 2);
    expect(f.intercept).toBeCloseTo(0.05, 2);
    expect(f.r2).toBeGreaterThan(0.99);
    expect(f.p).toBeLessThan(0.001);
    expect(ols([1, 2], [1, 2])).toBeNull();
    expect(ols([3, 3, 3], [1, 2, 3])).toBeNull();
    const flat = ols([1, 2, 3, 4, 5, 6], [5, 4, 6, 5, 4, 6])!;
    expect(flat.p).toBeGreaterThan(0.3);
  });
  it("gives a growth rate for levels and a straight line for rates", () => {
    const wage = Array.from({ length: 24 }, (_, i) => 5000 * 1.005 ** i);
    const t = trend(wage, 12, true)!;
    expect(t.kind).toBe("log");
    expect(t.perPeriod).toBeCloseTo(0.005, 6);
    expect(t.perYear).toBeCloseTo(1.005 ** 12 - 1, 6);
    expect(t.fitted[23]).toBeCloseTo(wage[23]!, 4);
    const rate = trend([5, 4.8, 4.6, 4.4, 4.2, 4.0], 4, false)!;
    expect(rate.kind).toBe("linear");
    expect(rate.perYear).toBeCloseTo(-0.8, 6);
    // A balance that crosses zero cannot go on a log scale even when asked as a level.
    expect(trend([-1, 0, 1, 2], 1, true)!.kind).toBe("linear");
  });
});

describe("seasonality", () => {
  it("separates trend, season and remainder", () => {
    const season = [10, -5, -5, 0];
    const y = Array.from({ length: 20 }, (_, i) => 100 + 2 * i + season[i % 4]!);
    const d = decompose(y, 4)!;
    expect(d.seasonal.map((v) => Math.round(v * 100) / 100)).toEqual([10, -5, -5, 0]);
    expect(d.strength).toBeGreaterThan(0.99);
    expect(d.trend[0]).toBeNull();
    expect(d.trend[2]).toBeCloseTo(104, 6);
    expect(d.adjusted[4]).toBeCloseTo(108, 6);
    expect(decompose(y.slice(0, 7), 4)).toBeNull();
    const noSeason = decompose(
      Array.from({ length: 24 }, (_, i) => 50 + ((i * 7919) % 13) - 6),
      4,
    )!;
    expect(noSeason.strength).toBeLessThan(0.5);
  });
});

describe("forecast", () => {
  it("continues a seasonal series and widens the interval with the horizon", () => {
    const season = [8, -3, -6, 1];
    const y = Array.from({ length: 40 }, (_, i) => 200 + 1.5 * i + season[i % 4]! + (((i * 37) % 5) - 2) * 0.3);
    const f = forecast(y, 4, 8)!;
    expect(f.forecast.mean).toHaveLength(8);
    const truth = (i: number) => 200 + 1.5 * i + season[i % 4]!;
    expect(Math.abs(f.forecast.mean[0]! - truth(40))).toBeLessThan(2);
    expect(Math.abs(f.forecast.mean[7]! - truth(47))).toBeLessThan(5);
    expect(f.forecast.sd[7]!).toBeGreaterThan(f.forecast.sd[0]!);
    expect(f.backtest.tests).toBeGreaterThan(0);
    expect(f.backtest.mape).not.toBeNull();
  });
  it("keeps the naive method when smoothing does not beat it", () => {
    // A pure repeating season with no trend: "same as last year" is exact.
    const y = Array.from({ length: 36 }, (_, i) => [5, 9, 2, 7, 4, 8, 1, 6, 3, 9, 2, 5][i % 12]!);
    const f = forecast(y, 12, 12)!;
    expect(f.forecast.method).toBe("naive");
    expect(f.forecast.mean).toEqual(y.slice(24));
    expect(f.backtest.mae.naive).toBe(0);
  });
  it("needs enough history", () => {
    expect(forecast([1, 2, 3], 1, 2)).toBeNull();
    expect(forecast([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1, 2)!.forecast.mean[0]).toBeCloseTo(11, 0);
  });
});

describe("relationship", () => {
  it("correlates pairs and skips gaps", () => {
    const c = correlation([1, 2, null, 4, 5, 6], [2, 4, 9, 8, 10, 12])!;
    expect(c.r).toBeCloseTo(1, 9);
    expect(c.n).toBe(5);
    expect(correlation([1, 2, 3], [1, 2, 3])).toBeNull();
    expect(correlation([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
    const weak = correlation([1, 2, 3, 4, 5, 6, 7, 8], [3, 1, 4, 1, 5, 9, 2, 6])!;
    expect(weak.p).toBeGreaterThan(0.05);
  });
  it("finds which series leads", () => {
    const a = [0, 1, 0, -1, 0, 2, 0, -2, 0, 1, 3, 0, -1, 0, 1, 0];
    const b = [9, 9, ...a.slice(0, -2)]; // b repeats a two periods later
    const cc = crossCorrelation(a, b, 3);
    const best = cc.reduce((x, y) => (Math.abs(y.r) > Math.abs(x.r) ? y : x));
    expect(best.lag).toBe(2);
    expect(best.r).toBeGreaterThan(0.99);
  });
});

describe("convergence", () => {
  it("measures whether differences shrink and whether the poorer grow faster", () => {
    // Three regions: the poorest grows fastest.
    const panel = [
      [50, 60, 72],
      [100, 110, 121],
      [150, 157.5, 165.4],
    ];
    const cv = dispersion(panel);
    expect(cv[2]!).toBeLessThan(cv[0]!);
    const b = betaConvergence(
      panel.map((u) => u[0]!),
      panel.map((u) => u[2]!),
      2,
    )!;
    expect(b.beta).toBeLessThan(0);
    expect(b.halfLife).toBeGreaterThan(0);
    expect(b.points[0]!.growth).toBeCloseTo(20, 6);
    expect(betaConvergence([0, 1, 2], [1, 2, 3], 2)).toBeNull();
    expect(
      dispersion(
        [
          [2, 2],
          [4, 4],
        ],
        true,
      ),
    ).toEqual([1, 1]);
  });
});
