// Catalogue filters, kept in the URL (?q=…&d=…&g=…&f=…&s=…&z=…&sort=…) so a filtered list can be shared.

import type { Catalog, Frequency, Kpi } from "../../data";
import { periodEnd, scopesOf, seriesLength, seriesYears, SCOPES, type Scope } from "./kpiInfo";
import { searchDocs, searchKpis } from "./search";

export type CatSort = "relevance" | "newest" | "name" | "longest";
export const CAT_SORTS: CatSort[] = ["relevance", "newest", "name", "longest"];

export type CatFilters = {
  q: string;
  domain: string | null;
  group: string | null;
  freq: Frequency | null;
  source: string | null;
  scope: Scope | null;
  /** null = default: relevance while searching, newest data otherwise. */
  sort: CatSort | null;
};

export const EMPTY_FILTERS: CatFilters = { q: "", domain: null, group: null, freq: null, source: null, scope: null, sort: null };

const FREQS: Frequency[] = ["M", "Q", "A"];
const clean = (v: string | null) => (v && /^[a-z0-9_.]{1,64}$/i.test(v) ? v : null);

export function parseCatalogue(search: string): CatFilters {
  const p = new URLSearchParams(search);
  const f = p.get("f") as Frequency | null;
  const z = p.get("z") as Scope | null;
  const sort = p.get("sort") as CatSort | null;
  return {
    q: (p.get("q") ?? "").slice(0, 120),
    domain: clean(p.get("d")),
    group: clean(p.get("g")),
    freq: f && FREQS.includes(f) ? f : null,
    source: clean(p.get("s")),
    scope: z && SCOPES.includes(z) ? z : null,
    sort: sort && CAT_SORTS.includes(sort) ? sort : null,
  };
}

/** "?q=…&d=…" or "" when nothing is set; keys in a fixed order so equal filters give equal URLs. */
export function serialiseCatalogue(f: CatFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.domain) p.set("d", f.domain);
  if (f.group) p.set("g", f.group);
  if (f.freq) p.set("f", f.freq);
  if (f.source) p.set("s", f.source);
  if (f.scope) p.set("z", f.scope);
  if (f.sort) p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function activeFilterCount(f: CatFilters): number {
  return [f.domain, f.group, f.freq, f.source, f.scope].filter(Boolean).length + (f.q.trim() ? 1 : 0);
}

export function effectiveSort(f: CatFilters): CatSort {
  if (f.sort === "relevance" && !f.q.trim()) return "newest";
  return f.sort ?? (f.q.trim() ? "relevance" : "newest");
}

/** Filtered and sorted indicators. Relevance order comes from the search itself. */
export function applyCatalogue(cat: Catalog, f: CatFilters, docs = searchDocs(cat)): Kpi[] {
  let list = f.q.trim() ? searchKpis(docs, f.q) : cat.kpis.slice();
  list = list.filter(
    (k) =>
      (!f.domain || k.domain_key === f.domain) &&
      (!f.group || k.group_key === f.group) &&
      (!f.freq || k.frequency === f.freq) &&
      (!f.source || k.source_keys.includes(f.source)) &&
      (!f.scope || scopesOf(k, cat).includes(f.scope)),
  );
  const sort = effectiveSort(f);
  const byName = (a: Kpi, b: Kpi) => a.name_pl.localeCompare(b.name_pl, "pl");
  if (sort === "name") list.sort(byName);
  else if (sort === "newest") list.sort((a, b) => periodEnd(b.last_period).localeCompare(periodEnd(a.last_period)) || byName(a, b));
  else if (sort === "longest") list.sort((a, b) => seriesYears(b) - seriesYears(a) || seriesLength(b) - seriesLength(a) || byName(a, b));
  return list;
}
