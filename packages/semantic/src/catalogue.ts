// The catalogue's view in the URL (?domain= or ?source=, plus ?q=) and the KPI filter over
// catalog.json kpis[] rows. Pure functions; Catalogue.tsx wires them later.

import { search } from "./search";

export type CatalogueKpi = { kpi_key: string; name_pl: string; name_en: string; domain_path: string[]; source_keys: string[] };
export type CatalogueSelection = { domain?: string; source?: string; q: string };

export function parseCatalogueParams(params: URLSearchParams): CatalogueSelection {
  const domain = params.get("domain") || undefined;
  const source = domain ? undefined : params.get("source") || undefined;
  return { domain, source, q: params.get("q") ?? "" };
}

export function catalogueParams(sel: CatalogueSelection): URLSearchParams {
  const p = new URLSearchParams();
  if (sel.domain) p.set("domain", sel.domain);
  if (sel.source && !sel.domain) p.set("source", sel.source);
  if (sel.q.trim()) p.set("q", sel.q);
  return p;
}

export function filterKpis<T extends CatalogueKpi>(kpis: T[], sel: CatalogueSelection): T[] {
  const rows = kpis.filter(
    (k) => (!sel.domain || k.domain_path.includes(sel.domain)) && (!sel.source || k.source_keys.includes(sel.source)),
  );
  if (!sel.q.trim()) return rows;
  const byKey = new Map(rows.map((k) => [k.kpi_key, k]));
  const hits = search(
    rows.map((k) => ({ key: k.kpi_key, name_pl: k.name_pl, name_en: k.name_en })),
    sel.q,
    rows.length,
  );
  return hits.map((h) => byKey.get(h.key)!);
}
