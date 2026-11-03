// Explorer part of the home page: the view builder (describe what you want to see) and ready-made views.

import type { Catalog } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { kpiName } from "../chartData";
import { exploreLink } from "../explore/exploreState";

const READY: { kpi: string; geo?: string[]; pl: string; en: string }[] = [
  {
    kpi: "cpi_annual_rate",
    geo: ["PL", "DE", "CZ", "HU"],
    pl: "Inflacja w Polsce i u sąsiadów",
    en: "Inflation in Poland and its neighbours",
  },
  { kpi: "unemployment_lfs", pl: "Bezrobocie w czasie", en: "Unemployment over time" },
  { kpi: "avg_wage", pl: "Przeciętne wynagrodzenie", en: "Average wage" },
  { kpi: "gg_debt_gdp", geo: ["PL", "EU27", "DE", "FR"], pl: "Dług publiczny na tle UE", en: "Public debt against the EU" },
];

export function ViewBuilderSlot({ cat, lang }: { cat: Catalog; lang: Lang }) {
  const pl = lang === "pl";
  return (
    <div className="h-ready">
      {READY.map((r) => {
        const k = cat.kpis.find((x) => x.kpi_key === r.kpi);
        if (!k) return null;
        const areas = r.geo?.filter((g) => k.geographies.includes(g));
        return (
          <Link key={r.kpi} to={exploreLink(k, cat, areas ? { areas } : {})} className="zt-card h-tool">
            <span className="h-tool__title">{pl ? r.pl : r.en}</span>
            <span className="h-tool__text">{kpiName(k, lang)}</span>
          </Link>
        );
      })}
    </div>
  );
}
