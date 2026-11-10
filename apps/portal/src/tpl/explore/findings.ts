// Chart titles state the finding (design template: Content fundamentals). These helpers derive a short,
// neutral finding from the numbers: the change over the range for one series, the highest and lowest at the
// last period for several.

import type { Lang } from "../../i18n";
import type { ZPoint, ZSeries } from "@zohelo/visuals";

export type Valued = { x: string; y: number };

export function lastPoint(points: ZPoint[]): Valued | undefined {
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i]!;
    if (p.y !== null && Number.isFinite(p.y)) return { x: p.x, y: p.y };
  }
  return undefined;
}

export function firstPoint(points: ZPoint[]): Valued | undefined {
  const p = points.find((q) => q.y !== null && Number.isFinite(q.y));
  return p ? { x: p.x, y: p.y! } : undefined;
}

export function peakPoint(points: ZPoint[]): Valued | undefined {
  let best: Valued | undefined;
  for (const p of points) if (p.y !== null && Number.isFinite(p.y) && (!best || p.y > best.y)) best = { x: p.x, y: p.y };
  return best;
}

/** Value of every series at its own last valued period, sorted high to low. */
export function ranking(series: ZSeries[]): { id: string; label: string; x: string; y: number }[] {
  return series
    .map((s) => ({ s, p: lastPoint(s.points) }))
    .filter((r): r is { s: ZSeries; p: Valued } => !!r.p)
    .map((r) => ({ id: r.s.id, label: r.s.label, x: r.p.x, y: r.p.y }))
    .sort((a, b) => b.y - a.y);
}

type Fmt = { value: (v: number) => string; period: (p: string) => string };

/** One series: "Spadek z 3,1% do 2,9% od 2015"; several: "Najwyżej Niemcy (3,1%), najniżej Francja (1,4%)". */
export function findingTitle(series: ZSeries[], fmt: Fmt, lang: Lang): string {
  const pl = lang === "pl";
  if (!series.length) return pl ? "Brak danych dla wybranego zapytania" : "No data for this query";
  if (series.length === 1) {
    const a = firstPoint(series[0]!.points),
      b = lastPoint(series[0]!.points);
    if (!a || !b) return pl ? "Brak danych dla wybranego okresu" : "No data for this period";
    if (a.x === b.x) return `${fmt.value(b.y)} (${fmt.period(b.x)})`;
    const word = b.y > a.y ? (pl ? "Wzrost" : "Up") : b.y < a.y ? (pl ? "Spadek" : "Down") : pl ? "Bez zmian" : "Unchanged";
    return b.y === a.y
      ? `${word}: ${fmt.value(b.y)} (${fmt.period(a.x)}–${fmt.period(b.x)})`
      : pl
        ? `${word} z ${fmt.value(a.y)} do ${fmt.value(b.y)} (${fmt.period(a.x)}–${fmt.period(b.x)})`
        : `${word} from ${fmt.value(a.y)} to ${fmt.value(b.y)} (${fmt.period(a.x)}–${fmt.period(b.x)})`;
  }
  const r = ranking(series);
  if (!r.length) return pl ? "Brak danych dla wybranego okresu" : "No data for this period";
  const hi = r[0]!,
    lo = r[r.length - 1]!;
  const when = hi.x === lo.x ? `, ${fmt.period(hi.x)}` : "";
  return pl
    ? `Najwyżej ${hi.label} (${fmt.value(hi.y)}), najniżej ${lo.label} (${fmt.value(lo.y)})${when}`
    : `Highest ${hi.label} (${fmt.value(hi.y)}), lowest ${lo.label} (${fmt.value(lo.y)})${when}`;
}
