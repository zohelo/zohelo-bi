// Indicator search: accent- and case-insensitive (Polish letters fold to ASCII, "łódź" = "lodz"), every
// word of the query must match; matches in the indicator name rank above matches in its domain or source.

import type { Lang } from "../../i18n";
import type { Catalog, Kpi } from "../../data";

/** Lower case, Polish and other diacritics folded, punctuation as single spaces. */
export function normalise(text: string): string {
  return text
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function queryTokens(query: string): string[] {
  return normalise(query).split(" ").filter(Boolean);
}

export type SearchDoc = { kpi: Kpi; name: string; rest: string };

/** Pre-normalised text per indicator: its names, then key, domain, group, sources and unit. */
export function searchDocs(cat: Catalog): SearchDoc[] {
  const dom = new Map(cat.domains.map((d) => [d.domain_key, `${d.name_pl} ${d.name_en}`]));
  const src = new Map(cat.sources.map((s) => [s.source_key, `${s.name_pl} ${s.name_en} ${s.register_id}`]));
  const unit = new Map(cat.units.map((u) => [u.unit_key, `${u.name_pl} ${u.name_en}`]));
  return cat.kpis.map((k) => ({
    kpi: k,
    name: ` ${normalise(`${k.name_pl} ${k.name_en}`)} `,
    rest: ` ${normalise(
      [
        k.kpi_key.replace(/_/g, " "),
        dom.get(k.domain_key) ?? "",
        dom.get(k.group_key) ?? "",
        ...k.source_keys.map((s) => src.get(s) ?? s),
        unit.get(k.unit_key) ?? "",
        k.geo_levels.includes("voivodeship") ? "wojewodztwa regiony voivodeships regions" : "",
      ].join(" "),
    )} `,
  }));
}

/** 0 = no match; higher = better. Word starts in the name score most. */
export function score(doc: SearchDoc, tokens: string[]): number {
  if (!tokens.length) return 1;
  let total = 0;
  for (const t of tokens) {
    if (doc.name.includes(` ${t}`)) total += 3;
    else if (doc.name.includes(t)) total += 2;
    else if (doc.rest.includes(t)) total += 1;
    else return 0;
  }
  return total;
}

/** Indicators matching the query, best first (stable within equal scores). */
export function searchKpis(docs: SearchDoc[], query: string): Kpi[] {
  const tokens = queryTokens(query);
  return docs
    .map((d, i) => ({ d, i, s: score(d, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.d.kpi);
}

/** Polish plural: 1 wskaźnik, 2–4 wskaźniki, 5+ wskaźników (12–14 take the many form). */
export function plural(n: number, lang: Lang, pl: [string, string, string], en: [string, string]): string {
  if (lang === "en") return n === 1 ? en[0] : en[1];
  if (n === 1) return pl[0];
  const d = n % 10,
    h = n % 100;
  return d >= 2 && d <= 4 && (h < 12 || h > 14) ? pl[1] : pl[2];
}

/** Loose suggestions for a mistyped key or phrase: any word (4+ letters, ending trimmed) may match; more matching words rank higher. */
export function suggestKpis(docs: SearchDoc[], phrase: string, limit = 5): Kpi[] {
  // Crude stemming for Polish endings: "bezrobocia" → "bezroboc" also finds "bezrobocie".
  const tokens = queryTokens(phrase)
    .filter((t) => t.length >= 4)
    .map((t) => t.slice(0, Math.max(4, t.length - 2)));
  return docs
    .map((d, i) => ({ d, i, s: tokens.reduce((sum, t) => sum + score(d, [t]), 0) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((x) => x.d.kpi);
}
