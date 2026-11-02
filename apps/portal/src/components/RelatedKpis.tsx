import type { RelatedItem } from "@zohelo/semantic";
import { Link } from "../router";
import { pickName, t, type Lang } from "../i18n";

// The KPI page's list of other KPIs of the same subgroup (relatedKpis). No page uses it until the
// /kpi/:key route exists.

export function RelatedKpis({ items, lang = "en" }: { items: RelatedItem[]; lang?: Lang }) {
  if (items.length === 0) return null;
  const other: Lang = lang === "pl" ? "en" : "pl";
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>{t(lang, "related.title")}</h2>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item.kpi_key}>
            <Link to={`/kpi/${encodeURIComponent(item.kpi_key)}`}>{pickName(lang, item)}</Link>{" "}
            <span className="hint" lang={other}>
              {other === "pl" ? item.name_pl : item.name_en}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
