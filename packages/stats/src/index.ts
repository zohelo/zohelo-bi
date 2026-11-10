// @zohelo/stats: the numeric engine of the "Analizy" part (docs/analysis-design.md). Pure functions on arrays of
// numbers, no dates, no UI, no dependencies; the portal's recipes turn their results into charts and sentences.
// Every method here is a textbook one that can be explained to a business reader in one paragraph and checked by
// hand in a spreadsheet: least squares, classical decomposition, exponential smoothing, correlation, convergence.

// ---------- basics

export const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Sample variance (n − 1). */
export function variance(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1);
}

export const sd = (xs: number[]): number => Math.sqrt(variance(xs));

/** Linear-interpolated quantile, q in 0..1. */
export function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo]! + (s[hi]! - s[lo]!) * (pos - lo);
}

/** Change against `lag` periods earlier: in per cent (`pct`) or as a difference. The first `lag` values are null. */
export function change(xs: number[], lag: number, pct: boolean): (number | null)[] {
  return xs.map((x, i) => {
    const b = xs[i - lag];
    if (b === undefined) return null;
    if (!pct) return x - b;
    return b === 0 ? null : ((x - b) / Math.abs(b)) * 100;
  });
}

// ---------- Student's t (for p-values)

function lgamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155, 0.001208650973866179, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (const cj of c) ser += cj / ++y;
  return -tmp + Math.log((2.506628274631 * ser) / x);
}

/** Regularised incomplete beta function I_x(a, b) (continued fraction). */
function betai(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (a: number, b: number, x: number) => {
    const tiny = 1e-30;
    let c = 1;
    let d = 1 - ((a + b) * x) / (a + 1);
    if (Math.abs(d) < tiny) d = tiny;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 200; m++) {
      const m2 = 2 * m;
      let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d;
      if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      h *= d * c;
      aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d;
      if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? (bt * cf(a, b, x)) / a : 1 - (bt * cf(b, a, 1 - x)) / b;
}

/** Two-sided p-value of a t statistic with `df` degrees of freedom. */
export function tPValue(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  if (df <= 0) return 1;
  return betai(df / 2, 0.5, df / (df + t * t));
}

// ---------- least squares

export type Fit = {
  slope: number;
  intercept: number;
  /** Share of the variance of y explained (0..1). */
  r2: number;
  n: number;
  /** Standard error of the slope. */
  se: number;
  /** Two-sided p-value of "slope = 0". */
  p: number;
};

/** Simple regression of y on x; null with fewer than 3 points or constant x. */
export function ols(x: number[], y: number[]): Fit | null {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i]! - mx) ** 2;
    sxy += (x[i]! - mx) * (y[i]! - my);
    syy += (y[i]! - my) ** 2;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const sse = Math.max(0, syy - slope * sxy);
  const r2 = syy === 0 ? 1 : 1 - sse / syy;
  const se = Math.sqrt(sse / (n - 2) / sxx);
  const p = se === 0 ? 0 : tPValue(slope / se, n - 2);
  return { slope, intercept, r2, n, se, p };
}

export type Trend = {
  /** `log`: fitted on log(y), growth is a rate per period; `linear`: growth is a difference per period. */
  kind: "log" | "linear";
  /** Per period: a rate (0.004 = 0.4%) for `log`, units of y for `linear`. */
  perPeriod: number;
  /** Per `m` periods (a year): compounded for `log`. */
  perYear: number;
  r2: number;
  p: number;
  /** Fitted values, same length as the input. */
  fitted: number[];
};

/**
 * Trend over time by least squares. Levels that are all positive are fitted on a log scale, so the result is an
 * average growth rate; rates, balances and anything that can be zero or negative get a straight line.
 */
export function trend(y: number[], m: number, asLevel: boolean): Trend | null {
  const t = y.map((_, i) => i);
  const log = asLevel && y.every((v) => v > 0);
  const f = ols(t, log ? y.map((v) => Math.log(v)) : y);
  if (!f) return null;
  const fitted = t.map((i) => (log ? Math.exp(f.intercept + f.slope * i) : f.intercept + f.slope * i));
  return log
    ? { kind: "log", perPeriod: Math.exp(f.slope) - 1, perYear: Math.exp(f.slope * m) - 1, r2: f.r2, p: f.p, fitted }
    : { kind: "linear", perPeriod: f.slope, perYear: f.slope * m, r2: f.r2, p: f.p, fitted };
}

// ---------- seasonality (classical additive decomposition)

export type Decomposition = {
  /** Centred moving average; null at both ends. */
  trend: (number | null)[];
  /** One effect per position in the season (length m), summing to zero. Position of observation i is i mod m. */
  seasonal: number[];
  residual: (number | null)[];
  /** Strength of seasonality 0..1: 1 − Var(residual) / Var(seasonal + residual). */
  strength: number;
  /** y minus the seasonal effect. */
  adjusted: number[];
};

/** Classical additive decomposition for a season of length m; null with fewer than two full seasons. */
export function decompose(y: number[], m: number): Decomposition | null {
  const n = y.length;
  if (m < 2 || n < 2 * m) return null;
  const half = Math.floor(m / 2);
  const tr: (number | null)[] = y.map((_, i) => {
    if (i < half || i >= n - half) return null;
    let s = 0;
    if (m % 2 === 0) {
      for (let k = -half; k <= half; k++) s += y[i + k]! * (k === -half || k === half ? 0.5 : 1);
      return s / m;
    }
    for (let k = -half; k <= half; k++) s += y[i + k]!;
    return s / m;
  });
  const sums = Array.from({ length: m }, () => ({ s: 0, c: 0 }));
  y.forEach((v, i) => {
    const t = tr[i];
    if (t === null || t === undefined) return;
    const b = sums[i % m]!;
    b.s += v - t;
    b.c += 1;
  });
  const raw = sums.map((b) => (b.c ? b.s / b.c : 0));
  const centre = mean(raw);
  const seasonal = raw.map((v) => v - centre);
  const residual = y.map((v, i) => (tr[i] === null ? null : v - tr[i]! - seasonal[i % m]!));
  const r = residual.filter((v): v is number => v !== null);
  const sr = y.flatMap((v, i) => (tr[i] === null ? [] : [v - tr[i]!]));
  const vsr = variance(sr);
  const strength = vsr === 0 ? 0 : Math.max(0, Math.min(1, 1 - variance(r) / vsr));
  return { trend: tr, seasonal, residual, strength, adjusted: y.map((v, i) => v - seasonal[i % m]!) };
}

// ---------- forecast (exponential smoothing against the naive benchmark)

export type Forecast = {
  method: "smoothing" | "naive";
  /** Point forecasts for horizons 1..h. */
  mean: number[];
  /** Standard deviation of the forecast error at each horizon. */
  sd: number[];
  /** One-step in-sample residual standard deviation. */
  sigma: number;
};

type Params = { alpha: number; beta: number; gamma: number; phi: number };

/** Additive damped-trend smoothing (Holt; Holt-Winters when m > 1): fitted one-step errors and the final state. */
function smooth(y: number[], m: number, p: Params) {
  const seasonalOn = m > 1;
  let level: number;
  let slope: number;
  const season: number[] = [];
  let start: number;
  if (seasonalOn) {
    const first = mean(y.slice(0, m));
    const second = mean(y.slice(m, 2 * m));
    level = first;
    slope = (second - first) / m;
    for (let i = 0; i < m; i++) season.push(y[i]! - first);
    start = m;
  } else {
    level = y[0]!;
    slope = y[1]! - y[0]!;
    start = 1;
  }
  let sse = 0;
  let count = 0;
  for (let t = start; t < y.length; t++) {
    const s = seasonalOn ? season[t - m]! : 0;
    const pred = level + p.phi * slope + s;
    const e = y[t]! - pred;
    sse += e * e;
    count++;
    const prev = level;
    level = prev + p.phi * slope + p.alpha * e;
    slope = p.phi * slope + p.alpha * p.beta * e;
    if (seasonalOn) season.push(s + p.gamma * e);
  }
  return { level, slope, season, sse, count };
}

function smoothingForecast(y: number[], m: number, h: number): Forecast | null {
  const seasonalOn = m > 1;
  if (y.length < (seasonalOn ? 2 * m + 2 : 6)) return null;
  let best: { p: Params; fit: ReturnType<typeof smooth> } | null = null;
  for (const alpha of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9])
    for (const beta of [0.01, 0.05, 0.1, 0.2, 0.4])
      for (const gamma of seasonalOn ? [0.05, 0.1, 0.2, 0.4] : [0])
        for (const phi of [0.85, 0.95, 1]) {
          const p = { alpha, beta, gamma, phi };
          const fit = smooth(y, m, p);
          if (!best || fit.sse < best.fit.sse) best = { p, fit };
        }
  if (!best) return null;
  const { p, fit } = best;
  const sigma = Math.sqrt(fit.sse / Math.max(1, fit.count - 3));
  const out: number[] = [];
  const sds: number[] = [];
  let damp = 0;
  let acc = 0;
  for (let k = 1; k <= h; k++) {
    damp += p.phi ** k;
    const s = seasonalOn ? fit.season[fit.season.length - m + ((k - 1) % m)]! : 0;
    out.push(fit.level + damp * fit.slope + s);
    // Forecast variance of the additive damped model: σ² (1 + Σ c_j²), j = 1..k−1.
    sds.push(sigma * Math.sqrt(1 + acc));
    let dj = 0;
    for (let i = 1; i <= k; i++) dj += p.phi ** i;
    const c = p.alpha + p.alpha * p.beta * dj + (seasonalOn && k % m === 0 ? p.gamma : 0);
    acc += c * c;
  }
  return { method: "smoothing", mean: out, sd: sds, sigma };
}

/** Seasonal naive: the same period a season earlier (m = 1: the last value). */
function naiveForecast(y: number[], m: number, h: number): Forecast | null {
  if (y.length < m + 2) return null;
  const errs = y.slice(m).map((v, i) => v - y[i]!);
  const sigma = Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / errs.length);
  const out: number[] = [];
  const sds: number[] = [];
  for (let k = 1; k <= h; k++) {
    out.push(y[y.length - m + ((k - 1) % m)]!);
    sds.push(sigma * Math.sqrt(Math.floor((k - 1) / m) + 1));
  }
  return { method: "naive", mean: out, sd: sds, sigma };
}

export type Backtest = {
  /** Mean absolute error of each method over the test forecasts. */
  mae: { smoothing: number | null; naive: number | null };
  /** Mean absolute percentage error of the chosen method; null when the series is not strictly positive. */
  mape: number | null;
  /** Number of test forecasts (origins × horizons). */
  tests: number;
};

/**
 * Forecast h periods ahead. Two methods compete on the series' own past (rolling origin: forecast from an earlier
 * point, compare with what happened): exponential smoothing and the naive "same as a season ago". The one with the
 * smaller error is used, so a model is never preferred to common sense without earning it.
 */
export function forecast(y: number[], m: number, h: number): { forecast: Forecast; backtest: Backtest } | null {
  // Too little history for any honest forecast: two seasons, or eight points without a season.
  if (y.length < (m > 1 ? 2 * m : 8)) return null;
  // Room for testing on the past: what is left after the shortest history smoothing needs.
  const room = y.length - Math.max(2 * m + 2, 6);
  const hb = Math.min(h, Math.max(0, room));
  const origins = hb > 0 ? Math.min(8, room - hb + 1) : 0;
  const err = { smoothing: [] as number[], naive: [] as number[] };
  const pct: Record<"smoothing" | "naive", number[]> = { smoothing: [], naive: [] };
  const positive = y.every((v) => v > 0);
  for (let o = 0; o < origins; o++) {
    const cut = y.length - hb - o;
    const past = y.slice(0, cut);
    const actual = y.slice(cut, cut + hb);
    for (const [name, f] of [
      ["smoothing", smoothingForecast(past, m, hb)],
      ["naive", naiveForecast(past, m, hb)],
    ] as const) {
      if (!f) continue;
      actual.forEach((a, i) => {
        err[name].push(Math.abs(a - f.mean[i]!));
        if (positive) pct[name].push(Math.abs((a - f.mean[i]!) / a) * 100);
      });
    }
  }
  const mae = { smoothing: err.smoothing.length ? mean(err.smoothing) : null, naive: err.naive.length ? mean(err.naive) : null };
  const s = smoothingForecast(y, m, h);
  const nv = naiveForecast(y, m, h);
  // Smoothing has to beat the naive method on the past to be used; untested or tied, the simpler one stays.
  const useSmoothing = s && (!nv || (mae.smoothing !== null && mae.naive !== null && mae.smoothing < mae.naive));
  const chosen = useSmoothing ? s : (nv ?? s);
  if (!chosen) return null;
  const which = chosen.method;
  return {
    forecast: chosen,
    backtest: { mae, mape: positive && pct[which].length ? mean(pct[which]) : null, tests: err[which].length },
  };
}

// ---------- relationship between two series

export type Correlation = { r: number; n: number; p: number };

/** Pearson correlation of the pairs where both values exist; null with fewer than 4 pairs or a constant series. */
export function correlation(a: (number | null)[], b: (number | null)[]): Correlation | null {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i];
    const y = b[i];
    if (typeof x === "number" && typeof y === "number") {
      xs.push(x);
      ys.push(y);
    }
  }
  const n = xs.length;
  if (n < 4) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i]! - mx) * (ys[i]! - my);
    sxx += (xs[i]! - mx) ** 2;
    syy += (ys[i]! - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
  const t = Math.abs(r) === 1 ? Infinity : r * Math.sqrt((n - 2) / (1 - r * r));
  return { r, n, p: tPValue(t, n - 2) };
}

/**
 * Correlation of a with b shifted: lag k > 0 pairs a at t with b at t + k (a leads b by k periods), k < 0 the
 * reverse. Lags from −maxLag to +maxLag.
 */
export function crossCorrelation(a: (number | null)[], b: (number | null)[], maxLag: number): { lag: number; r: number; n: number }[] {
  const out: { lag: number; r: number; n: number }[] = [];
  for (let k = -maxLag; k <= maxLag; k++) {
    const shifted = a.map((_, i) => b[i + k] ?? null);
    const c = correlation(a, shifted);
    if (c) out.push({ lag: k, r: c.r, n: c.n });
  }
  return out;
}

// ---------- convergence across regions or countries

/** Coefficient of variation (sd / mean) of each period's cross-section; `absolute` gives the sd itself (rates). */
export function dispersion(panel: number[][], absolute = false): number[] {
  // panel[unit][period]
  const periods = Math.min(...panel.map((u) => u.length));
  return Array.from({ length: periods }, (_, t) => {
    const xs = panel.map((u) => u[t]!);
    const s = Math.sqrt(xs.reduce((a, x) => a + (x - mean(xs)) ** 2, 0) / xs.length);
    return absolute ? s : s / mean(xs);
  });
}

export type BetaConvergence = {
  /** Slope of average growth on log initial level; negative = poorer units grow faster. */
  beta: number;
  p: number;
  r2: number;
  /** Years to halve a gap at this speed; null when not converging. */
  halfLife: number | null;
  /** Per unit: log initial level and average yearly growth in per cent. */
  points: { initial: number; growth: number }[];
};

/** Beta convergence: average yearly growth of each unit against its starting level (positive levels only). */
export function betaConvergence(first: number[], last: number[], years: number): BetaConvergence | null {
  if (years <= 0 || first.some((v) => v <= 0) || last.some((v) => v <= 0)) return null;
  const x = first.map((v) => Math.log(v));
  const g = first.map((v, i) => Math.log(last[i]! / v) / years);
  const f = ols(x, g);
  if (!f) return null;
  return {
    beta: f.slope,
    p: f.p,
    r2: f.r2,
    // Speed λ from β = −(1 − e^(−λT)) / T; half-life = ln 2 / λ.
    halfLife: f.slope < 0 && 1 + f.slope * years > 0 ? Math.log(2) / (-Math.log(1 + f.slope * years) / years) : null,
    points: first.map((v, i) => ({ initial: v, growth: (Math.exp(g[i]!) - 1) * 100 })),
  };
}
