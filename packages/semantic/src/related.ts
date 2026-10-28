// Related KPIs on a KPI page: the other KPIs of the same taxonomy subgroup (catalog.json
// kpis[].subgroup_key); nothing beyond the subgroup.

export type RelatedItem = { kpi_key: string; name_pl: string; name_en: string; subgroup_key: string };

export function relatedKpis(kpis: RelatedItem[], kpiKey: string, limit = 6): RelatedItem[] {
  const self = kpis.find((k) => k.kpi_key === kpiKey);
  if (!self) return [];
  return kpis
    .filter((k) => k.kpi_key !== kpiKey && k.subgroup_key === self.subgroup_key)
    .sort((a, b) => a.name_en.localeCompare(b.name_en, "en"))
    .slice(0, limit);
}
