// The KPI page's facts: citation, headline value and source rows. Inputs are subsets of
// catalog.json and kpi/<key>/latest.json rows (zohelo-data docs/published.md).

export function citation(kpi: { kpi_key: string; name_en: string }, sourceNames: string[], accessed: Date): string {
  return `${kpi.name_en}, ${sourceNames.join("; ")}, zohelo-bi, accessed ${accessed.toISOString().slice(0, 10)}, bi.zohelo.com/kpi/${kpi.kpi_key}`;
}

export type LatestValue = {
  source_key: string;
  geography_level: string;
  period: string;
  value: number;
  previous_period?: string;
  previous_value?: number;
};

export type Headline = { source_key: string; period: string; value: number; previous_period?: string; delta: number | null };

/** The country value of the first source in sourceOrder that has one, else the first country value. */
export function headline(values: LatestValue[], sourceOrder: string[]): Headline | null {
  const candidates = values.filter((v) => v.geography_level === "country");
  const pick = sourceOrder.map((s) => candidates.find((v) => v.source_key === s)).find(Boolean) ?? candidates[0];
  if (!pick) return null;
  const out: Headline = {
    source_key: pick.source_key,
    period: pick.period,
    value: pick.value,
    delta: pick.previous_value === undefined ? null : pick.value - pick.previous_value,
  };
  if (pick.previous_period !== undefined) out.previous_period = pick.previous_period;
  return out;
}

export type SourceRow = {
  source_key: string;
  name_en: string;
  register_id: string;
  licence_name: string | null;
  licence_url: string | null;
  attribution_text: string | null;
};

export function sourceRows(
  sourceKeys: string[],
  sources: { source_key: string; name_en: string; register_id: string; licence_key: string }[],
  licences: { licence_key: string; name: string; url: string; attribution_text: string }[],
): SourceRow[] {
  const rows: SourceRow[] = [];
  for (const key of sourceKeys) {
    const s = sources.find((x) => x.source_key === key);
    if (!s) continue;
    const l = licences.find((x) => x.licence_key === s.licence_key);
    rows.push({
      source_key: s.source_key,
      name_en: s.name_en,
      register_id: s.register_id,
      licence_name: l?.name ?? null,
      licence_url: l?.url ?? null,
      attribution_text: l?.attribution_text ?? null,
    });
  }
  return rows;
}
