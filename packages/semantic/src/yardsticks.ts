// Official yardsticks (dashboards/yardsticks.yaml; docs/national-dashboard-research.md): the thresholds and targets
// the EU judges a member state by (Maastricht criteria, MIP scoreboard, 2030 social targets, SDG targets), grouped
// by framework. A `scorecard` dashboard card names a framework; each of its indicators is measured the way the
// framework measures it (latest value, 12-month average, 3-year change…) and judged against the rule. The verdict is
// the official rule's, not ours. Reference values change (the Maastricht ones in every convergence report), so they
// live in the YAML with the report they come from, never in code.

export const YARDSTICK_MEASURES = ["latest", "avg12m", "avg3y", "change1y", "change3y", "change3y_pp"] as const;
export type YardstickMeasure = (typeof YARDSTICK_MEASURES)[number];

export type YardstickRule = {
  kpi: string;
  /** How the framework measures the indicator (default latest). */
  measure?: YardstickMeasure;
  /** Meets when the measured value is at most `max`, at least `min`, or within `range`. */
  max?: number;
  min?: number;
  range?: [number, number];
  /** A verdict that does not come from the data (e.g. "not in ERM II"). */
  verdict?: "meets" | "misses";
  /** The yardstick as shown: "≤ 2,7%", "≥ 78% w 2030". */
  label_pl: string;
  label_en: string;
  note_pl?: string;
  note_en?: string;
};

export type YardstickFramework = {
  name_pl: string;
  name_en: string;
  /** Who sets it and in which document; shown under the scorecard. */
  source_pl: string;
  source_en: string;
  url?: string;
  /** Date of the document the reference values come from (YYYY-MM). */
  as_of: string;
  rules: YardstickRule[];
};

export type Yardsticks = { schema: 1; frameworks: Record<string, YardstickFramework> };

const filled = (x: unknown): x is string => typeof x === "string" && x.trim().length > 0;
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** Structural problems of the yardsticks file (Polish / English, with the path). */
export function validateYardsticks(y: unknown, file = "dashboards/yardsticks.yaml"): string[] {
  const out: string[] = [];
  const say = (path: string, pl: string, en: string) => out.push(`${file}: ${path}: ${pl} / ${en}`);
  if (!isObj(y) || y.schema !== 1 || !isObj(y.frameworks)) {
    say("", "wymagane schema: 1 i frameworks", "schema: 1 and frameworks are required");
    return out;
  }
  for (const [key, f] of Object.entries(y.frameworks)) {
    const p = `frameworks.${key}`;
    if (!/^[a-z][a-z0-9_]*$/.test(key)) say(p, "klucz: małe litery, cyfry, _", "key: lower case, digits, _");
    if (!isObj(f)) {
      say(p, "ramy muszą być obiektem", "a framework must be an object");
      continue;
    }
    for (const t of ["name_pl", "name_en", "source_pl", "source_en"]) if (!filled(f[t])) say(`${p}.${t}`, "brak tekstu", "text missing");
    if (!(typeof f.as_of === "string" && /^\d{4}-\d{2}$/.test(f.as_of))) say(`${p}.as_of`, "data RRRR-MM", "date YYYY-MM");
    if (!Array.isArray(f.rules) || f.rules.length === 0) {
      say(`${p}.rules`, "potrzeba reguł", "rules are needed");
      continue;
    }
    const seen = new Set<string>();
    f.rules.forEach((r: unknown, i: number) => {
      const q = `${p}.rules[${i}]`;
      if (!isObj(r)) return say(q, "reguła musi być obiektem", "a rule must be an object");
      if (!filled(r.kpi)) say(`${q}.kpi`, "brak klucza KPI", "KPI key missing");
      else if (seen.has(r.kpi)) say(`${q}.kpi`, `KPI ${r.kpi} powtórzony`, `KPI ${r.kpi} repeated`);
      else seen.add(r.kpi);
      if (r.measure !== undefined && !(YARDSTICK_MEASURES as readonly string[]).includes(r.measure as string))
        say(`${q}.measure`, `miara: ${YARDSTICK_MEASURES.join(", ")}`, `measure: ${YARDSTICK_MEASURES.join(", ")}`);
      const tests = [r.max !== undefined, r.min !== undefined, r.range !== undefined, r.verdict !== undefined].filter(Boolean).length;
      if (tests > 1) say(q, "najwyżej jedno z: max, min, range, verdict", "at most one of max, min, range, verdict");
      if (r.max !== undefined && typeof r.max !== "number") say(`${q}.max`, "liczba", "a number");
      if (r.min !== undefined && typeof r.min !== "number") say(`${q}.min`, "liczba", "a number");
      if (r.range !== undefined && !(Array.isArray(r.range) && r.range.length === 2 && r.range[0] < r.range[1]))
        say(`${q}.range`, "[dolna, górna], dolna < górna", "[low, high] with low < high");
      if (r.verdict !== undefined && r.verdict !== "meets" && r.verdict !== "misses")
        say(`${q}.verdict`, "meets albo misses", "meets or misses");
      for (const t of ["label_pl", "label_en"]) if (!filled(r[t])) say(`${q}.${t}`, "brak tekstu", "text missing");
    });
  }
  return out;
}

/** KPI keys of the yardsticks the catalogue does not have. */
export function yardstickUnknownKpis(y: Yardsticks, kpis: { kpi_key: string }[]): string[] {
  const known = new Set(kpis.map((k) => k.kpi_key));
  return Object.entries(y.frameworks).flatMap(([key, f]) =>
    f.rules
      .filter((r) => !known.has(r.kpi))
      .map((r) => `dashboards/yardsticks.yaml: frameworks.${key}: nieznany KPI ${r.kpi} / unknown KPI ${r.kpi}`),
  );
}

export type YPoint = { period: string; value: number | null };
export type YFrequency = "M" | "Q" | "A";

const perYear: Record<YFrequency, number> = { M: 12, Q: 4, A: 1 };

/**
 * The value a framework compares: the latest value, the average of the last 12 months (annual data: the latest
 * value) or 3 years, or the change over 1 or 3 years (in %, or in percentage points for rates). Null when the
 * series is too short.
 */
export function measureValue(
  points: YPoint[],
  freq: YFrequency,
  measure: YardstickMeasure = "latest",
): { value: number; period: string } | null {
  const pts = points.filter((p): p is { period: string; value: number } => typeof p.value === "number" && Number.isFinite(p.value));
  const last = pts[pts.length - 1];
  if (!last) return null;
  const n = perYear[freq];
  const avg = (k: number) => {
    if (pts.length < k) return null;
    const xs = pts.slice(-k);
    return xs.reduce((a, p) => a + p.value, 0) / k;
  };
  const back = (years: number) => pts[pts.length - 1 - years * n];
  let value: number | null = null;
  switch (measure) {
    case "latest":
      value = last.value;
      break;
    case "avg12m":
      value = avg(n);
      break;
    case "avg3y":
      value = avg(3 * n);
      break;
    case "change1y":
    case "change3y": {
      const b = back(measure === "change1y" ? 1 : 3);
      value = b && b.value !== 0 ? ((last.value - b.value) / Math.abs(b.value)) * 100 : null;
      break;
    }
    case "change3y_pp": {
      const b = back(3);
      value = b ? last.value - b.value : null;
      break;
    }
  }
  return value === null ? null : { value, period: last.period };
}

export type YardstickVerdict = "meets" | "misses" | "none";

/** Whether a measured value meets the rule (none when there is no rule or no value). */
export function judgeYardstick(rule: YardstickRule | undefined, value: number | null | undefined): YardstickVerdict {
  if (!rule) return "none";
  if (rule.verdict) return rule.verdict;
  if (value === null || value === undefined) return "none";
  if (rule.max !== undefined) return value <= rule.max ? "meets" : "misses";
  if (rule.min !== undefined) return value >= rule.min ? "meets" : "misses";
  if (rule.range) return value >= rule.range[0] && value <= rule.range[1] ? "meets" : "misses";
  return "none";
}
