import { domainTree, filterKpis, sourceTree, type CatalogueSelection, type PublishedCatalog } from "@zohelo/semantic";
import { KpiGrid } from "../components/KpiGrid";
import { TreePanel, type TreeMode } from "../components/TreePanel";
import { Link } from "../router";

// The KPI catalogue over catalog.json: domain or source tree on the left, search and KPI cards on the
// right. Presentational; the catalogue route loads the data and owns the selection in the URL.

export function KpiCatalogueBody({
  catalog,
  sel,
  mode,
  onMode,
  onSelect,
  onSearch,
}: {
  catalog: PublishedCatalog;
  sel: CatalogueSelection;
  mode: TreeMode;
  onMode: (m: TreeMode) => void;
  onSelect: (key?: string) => void;
  onSearch: (q: string) => void;
}) {
  const kpis = filterKpis(catalog.kpis, sel);
  const units = Object.fromEntries(catalog.units.map((u) => [u.unit_key, { symbol: u.symbol, name_en: u.name_en }]));
  const sources = Object.fromEntries(catalog.sources.map((s) => [s.source_key, s.name_en]));
  return (
    <div className="page">
      <div className="page-head">
        <h1>Catalogue</h1>
        <p className="lede">
          {catalog.kpis.length} indicators from {catalog.sources.length} sources.{" "}
          <Link to="/catalogue?view=datasets">All source data blocks</Link>
        </p>
      </div>
      <div className="filters">
        <input
          className="search wide"
          aria-label="Search indicators"
          placeholder="Search indicators…"
          value={sel.q}
          onChange={(e) => onSearch(e.target.value)}
        />
        <span className="hint">{kpis.length} results</span>
      </div>
      <div className="catalogue-layout">
        <TreePanel
          mode={mode}
          domains={domainTree(catalog.kpis, catalog.domains)}
          sources={sourceTree(catalog.kpis, catalog.sources)}
          selected={mode === "domain" ? sel.domain : sel.source}
          onMode={onMode}
          onSelect={onSelect}
        />
        <KpiGrid kpis={kpis} units={units} sources={sources} loading={false} error={null} />
      </div>
    </div>
  );
}
