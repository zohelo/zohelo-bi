// Explorer query, kept whole in the URL so a link reproduces the view:
//   /explore?kpi=hicp_annual_rate&lvl=kraj&geo=PL,DE&src=eurostat&split=sex&from=2015&to=2026&view=line
// Parsing validates every part against the catalogue and falls back to sensible defaults, so a hand-edited
// or outdated link still opens a working view.

import type { Catalog, GeoLevel, Kpi } from "../../data";
import { euGeographies, hasVoivodeships, yearOf } from "./kpiInfo";

export type ExView = "line" | "bars" | "map" | "table";
export const EX_VIEWS: ExView[] = ["line", "bars", "map", "table"];

export type ExState = {
  kpi: string;
  level: GeoLevel;
  areas: string[];
  sources: string[];
  split: string | null;
  from: number;
  to: number;
  view: ExView;
};

export const DEFAULT_KPI = "hicp_annual_rate";
/** Default voivodeships: the three largest by population. */
const DEFAULT_VOIV = ["PL14", "PL24", "PL12"];
const LEVEL_PARAM: Record<GeoLevel, string> = { country: "kraj", voivodeship: "woj" };

export function levelGeos(k: Kpi, cat: Catalog, level: GeoLevel): string[] {
  const lv = new Map(cat.geographies.map((g) => [g.key, g.level]));
  return k.geographies.filter((g) => g === "PL" || lv.get(g) === level);
}

export function defaultAreas(k: Kpi, cat: Catalog, level: GeoLevel): string[] {
  const avail = levelGeos(k, cat, level);
  if (level === "voivodeship") return DEFAULT_VOIV.filter((g) => avail.includes(g));
  return euGeographies(k, cat).includes("EU27") ? ["PL", "EU27"] : ["PL"];
}

export function defaultState(k: Kpi, cat: Catalog): ExState {
  const last = yearOf(k.last_period);
  const first = yearOf(k.first_period);
  return {
    kpi: k.kpi_key,
    level: "country",
    areas: defaultAreas(k, cat, "country"),
    sources: [k.source_keys[0]!].filter(Boolean),
    split: null,
    from: Math.max(first, last - 10),
    to: last,
    view: "line",
  };
}

function findKpi(cat: Catalog, key: string | null): Kpi | undefined {
  return (key ? cat.kpis.find((k) => k.kpi_key === key) : undefined) ?? cat.kpis.find((k) => k.kpi_key === DEFAULT_KPI) ?? cat.kpis[0];
}

const list = (v: string | null) =>
  (v ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

/** Makes any state consistent with its indicator (used after parsing and after every edit). */
export function normaliseState(s: ExState, k: Kpi, cat: Catalog): ExState {
  const level: GeoLevel = s.level === "voivodeship" && hasVoivodeships(k) ? "voivodeship" : "country";
  const avail = levelGeos(k, cat, level);
  const areas = [...new Set(s.areas)].filter((g) => avail.includes(g));
  const sources = [...new Set(s.sources)].filter((x) => k.source_keys.includes(x));
  const first = yearOf(k.first_period),
    last = yearOf(k.last_period);
  const clamp = (y: number, d: number) => (Number.isFinite(y) ? Math.min(last, Math.max(first, Math.round(y))) : d);
  let from = clamp(s.from, Math.max(first, last - 10));
  let to = clamp(s.to, last);
  if (from > to) [from, to] = [to, from];
  return {
    kpi: k.kpi_key,
    level,
    areas: areas.length ? areas : defaultAreas(k, cat, level),
    sources: sources.length ? sources : [k.source_keys[0]!].filter(Boolean),
    split: s.split && k.dimension_keys.includes(s.split) ? s.split : null,
    from,
    to,
    view: s.view === "map" && level !== "voivodeship" ? "line" : EX_VIEWS.includes(s.view) ? s.view : "line",
  };
}

export function parseExplore(search: string, cat: Catalog): ExState | null {
  const p = new URLSearchParams(search);
  const k = findKpi(cat, p.get("kpi"));
  if (!k) return null;
  const d = defaultState(k, cat);
  const level: GeoLevel = p.get("lvl") === "woj" ? "voivodeship" : "country";
  const geo = list(p.get("geo"));
  const src = list(p.get("src"));
  const num = (v: string | null) => (v && /^\d{4}$/.test(v) ? Number(v) : NaN);
  return normaliseState(
    {
      kpi: k.kpi_key,
      level,
      areas: geo.length ? geo : level === d.level ? d.areas : defaultAreas(k, cat, level),
      sources: src.length ? src : d.sources,
      split: p.get("split"),
      from: p.has("from") ? num(p.get("from")) : d.from,
      to: p.has("to") ? num(p.get("to")) : d.to,
      view: (p.get("view") as ExView | null) ?? "line",
    },
    k,
    cat,
  );
}

/** "?kpi=…&lvl=…&geo=…&src=…&split=…&from=…&to=…&view=…" (split only when set). */
export function serialiseExplore(s: ExState): string {
  const p = new URLSearchParams();
  p.set("kpi", s.kpi);
  p.set("lvl", LEVEL_PARAM[s.level]);
  p.set("geo", s.areas.join(","));
  p.set("src", s.sources.join(","));
  if (s.split) p.set("split", s.split);
  p.set("from", String(s.from));
  p.set("to", String(s.to));
  p.set("view", s.view);
  return `?${p.toString().replace(/%2C/g, ",")}`;
}

/** Explorer link for one indicator with defaults (used by "Otwórz w Eksploratorze"). */
export function exploreLink(k: Kpi, cat: Catalog, over: Partial<ExState> = {}): string {
  return `/explore${serialiseExplore(normaliseState({ ...defaultState(k, cat), ...over }, k, cat))}`;
}
