// Search hits for the sidebar search: indicators, dashboards and guide pages, accent-insensitive.

import type { Catalog } from "../../data";
import { GUIDE_SECTIONS } from "../guide/sections";

export type Hit = { group: string; label: string; meta: string; to: string };

export const strip = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

/** Up to `limit` hits for the query, grouped dashboards → indicators → guide; every word must match. */
export function searchHits(catalog: Catalog | undefined, q: string, pl: boolean, limit = 10): Hit[] {
  if (!catalog) return [];
  const words = strip(q.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const dom = (key: string | null) => catalog.domains.find((d) => d.domain_key === key);
  const boards: Hit[] = catalog.domains
    .filter((d) => d.level !== "subgroup")
    .map((d) => ({
      group: pl ? "Dashboardy" : "Dashboards",
      label: name(d),
      meta: d.level === "domain" ? (pl ? "przegląd dziedziny" : "domain overview") : name(dom(d.parent_key)!),
      to: d.level === "domain" ? `/d/${d.domain_key}` : `/d/${d.parent_key}/${d.domain_key.split(".")[1]}`,
    }));
  const kpis: Hit[] = catalog.kpis.map((k) => ({
    group: pl ? "Wskaźniki" : "Indicators",
    label: name(k),
    meta: dom(k.group_key) ? name(dom(k.group_key)!) : "",
    to: `/kpi/${k.kpi_key}`,
  }));
  const guide: Hit[] = GUIDE_SECTIONS.map((s) => ({
    group: pl ? "Przewodnik" : "Guide",
    label: pl ? s.pl : s.en,
    meta: "",
    to: `/przewodnik/${s.slug}`,
  }));
  const match = (h: Hit) => {
    const t = strip(`${h.label} ${h.meta}`);
    return words.every((w) => t.includes(w));
  };
  // Dashboards first (few, most likely), then indicators, then guide pages; at most 4 dashboards.
  return [...boards.filter(match).slice(0, 4), ...kpis.filter(match), ...guide.filter(match)].slice(0, limit);
}
