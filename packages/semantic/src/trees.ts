// The catalogue's navigation trees over catalog.json (zohelo-data docs/published.md): domain →
// group → subgroup from domains[] and kpis[].domain_path, and one level of sources from
// kpis[].source_keys (the contract has no dataset per KPI). Input types are structural subsets.

export type TreeKpi = { kpi_key: string; domain_path: string[]; source_keys: string[] };
export type TreeDomain = { domain_key: string; level: string; parent_key: string | null; name_en: string; name_pl: string; sort: number };
export type TreeSource = { source_key: string; name_en: string; name_pl: string };
export type TreeNode = { key: string; name_en: string; name_pl: string; level: string; count: number; children: TreeNode[] };

const byName = (a: { name_en: string }, b: { name_en: string }) => a.name_en.localeCompare(b.name_en, "en");

export function domainTree(kpis: TreeKpi[], domains: TreeDomain[]): TreeNode[] {
  const build = (parent: string | null): TreeNode[] =>
    domains
      .filter((d) => d.parent_key === parent)
      .sort((a, b) => a.sort - b.sort || byName(a, b))
      .map((d) => ({
        key: d.domain_key,
        name_en: d.name_en,
        name_pl: d.name_pl,
        level: d.level,
        count: kpis.filter((k) => k.domain_path.includes(d.domain_key)).length,
        children: build(d.domain_key),
      }))
      .filter((n) => n.count > 0);
  return build(null);
}

export function sourceTree(kpis: TreeKpi[], sources: TreeSource[]): TreeNode[] {
  return sources
    .map((s) => ({
      key: s.source_key,
      name_en: s.name_en,
      name_pl: s.name_pl,
      level: "source",
      count: kpis.filter((k) => k.source_keys.includes(s.source_key)).length,
      children: [],
    }))
    .filter((n) => n.count > 0)
    .sort(byName);
}
