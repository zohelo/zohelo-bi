// Explorer links in the short `?kpi=` form, which the explorer parses (exploreState.ts, parseExplore) and rewrites
// to its canonical address on load. Pages outside the explorer (the home page's "Dla Ciebie") use exploreHref so
// they do not load the explorer's state module; exploreLink there builds the canonical address from the same
// parameters.

import type { GeoLevel } from "../../data";

export type ExState = {
  kpi: string;
  level: GeoLevel;
  areas: string[];
  sources: string[];
  split: string | null;
  from: number;
  to: number;
  view: "line" | "bars" | "map" | "table";
};

export function exploreParams(kpiKey: string, over: Partial<ExState> = {}): URLSearchParams {
  const p = new URLSearchParams({ kpi: over.kpi ?? kpiKey });
  if (over.level) p.set("lvl", over.level === "voivodeship" ? "woj" : "kraj");
  if (over.areas?.length) p.set("geo", over.areas.join(","));
  if (over.sources?.length) p.set("src", over.sources.join(","));
  if (over.split) p.set("split", over.split);
  if (over.from !== undefined) p.set("from", String(over.from));
  if (over.to !== undefined) p.set("to", String(over.to));
  if (over.view) p.set("view", over.view);
  return p;
}

/** Explorer link for one indicator, in the short form. */
export function exploreHref(kpiKey: string, over: Partial<ExState> = {}): string {
  return `/explore?${exploreParams(kpiKey, over).toString()}`;
}
