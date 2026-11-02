// v2 dashboard tiles → series queries: a tile's explorer view with the slicer values merged in and
// '$selected' replaced by the area chosen on the selecting tile. Pure functions; the v2 page calls them.

import { mergeView, metric, type Metric, type SlicerValues } from "@zohelo/semantic";
import type { Filters } from "./api";
import { embedFilters } from "./embed";
import { display } from "./labels";
import { parsePeriod } from "./period";
import type { Lang } from "./i18n";

export type TileQuery = { metric: Metric; filters: Filters; from?: string; to?: string };

const SELECTED = "$selected";

/** The series query of a tile, or null when its kpi_key is unknown or it needs a selection that is not made. */
export function tileQuery(tile: { kpi_key: string; view: string }, values: SlicerValues, selected: string | null): TileQuery | null {
  const m = metric(tile.kpi_key);
  if (!m) return null;
  const p = new URLSearchParams(mergeView(tile.view, values));
  for (const [k, v] of [...p.entries()]) {
    const parts = v.split("|");
    if (!parts.includes(SELECTED)) continue;
    if (selected === null) return null;
    p.set(k, parts.map((x) => (x === SELECTED ? selected : x)).join("|"));
  }
  p.set("metric", m.id);
  const filters = embedFilters(p, m);
  const { from, to } = parsePeriod(p);
  return { metric: m, filters, ...(from !== undefined && { from }), ...(to !== undefined && { to }) };
}

/** The tile's title in lang with '$selected' replaced by the selected area's name, or '…' while none is selected. */
export function tileTitle(tile: { title_pl: string; title_en: string }, lang: Lang, selected: string | null): string {
  const title = lang === "pl" ? tile.title_pl : tile.title_en;
  return title.replaceAll(SELECTED, selected === null ? "…" : display("geography_name", selected));
}
