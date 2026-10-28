import type { RelatedItem } from "@zohelo/semantic";
import { Link } from "../router";

// The KPI page's list of other KPIs of the same subgroup (relatedKpis). No page uses it until the
// /kpi/:key route exists.

export function RelatedKpis({ items }: { items: RelatedItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Related KPIs</h2>
      </header>
      <ul>
        {items.map((item) => (
          <li key={item.kpi_key}>
            <Link to={`/kpi/${encodeURIComponent(item.kpi_key)}`}>{item.name_en}</Link>{" "}
            <span className="hint" lang="pl">
              {item.name_pl}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
