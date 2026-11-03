import { useState } from "react";
import {
  catalogueParams,
  domainTree,
  filterKpis,
  parseCatalogueParams,
  sourceTree,
  type CatalogueSelection,
  type KpiLatest,
  type PublishedCatalog,
} from "@zohelo/semantic";
import { api } from "../api";
import { NO_LATEST } from "../change";
import { KpiGrid } from "../components/KpiGrid";
import { TreePanel, type TreeMode } from "../components/TreePanel";
import { useData } from "../components/useData";
import { Link, navigate, useLocation } from "../router";
import { pickName, t, type Lang } from "../i18n";

// The KPI catalogue over catalog.json: domain or source tree on the left, search and KPI cards on the
// right. Presentational; the catalogue route loads the data and owns the selection in the URL.

export function KpiCatalogueBody({
  catalog,
  sel,
  mode,
  onMode,
  onSelect,
  onSearch,
  latest,
  lang = "en",
}: {
  catalog: PublishedCatalog;
  /** kpi_key → latest.json once all have loaded (null: none); {} while loading; leave out for metadata-only cards. */
  latest?: Record<string, KpiLatest | null>;
  sel: CatalogueSelection;
  mode: TreeMode;
  onMode: (m: TreeMode) => void;
  onSelect: (key?: string) => void;
  onSearch: (q: string) => void;
  lang?: Lang;
}) {
  const kpis = filterKpis(catalog.kpis, sel);
  const units = Object.fromEntries(
    catalog.units.map((u) => [u.unit_key, { symbol: u.symbol, name_en: u.name_en, name_pl: u.name_pl, is_rate: u.is_rate }]),
  );
  const sources = Object.fromEntries(catalog.sources.map((s) => [s.source_key, pickName(lang, s)]));
  return (
    <div className="page">
      <div className="page-head">
        <h1>{t(lang, "catalogue.title")}</h1>
        <p className="lede">
          {t(lang, "kpiCat.lede").replace("{kpis}", String(catalog.kpis.length)).replace("{sources}", String(catalog.sources.length))}{" "}
          <Link to="/catalogue?view=datasets">{t(lang, "kpiCat.datasets")}</Link>
        </p>
      </div>
      <div className="filters">
        <input
          className="search wide"
          aria-label={t(lang, "kpiCat.searchLabel")}
          placeholder={t(lang, "kpiCat.search")}
          value={sel.q}
          onChange={(e) => onSearch(e.target.value)}
        />
        <span className="hint">{t(lang, "catalogue.results").replace("{n}", String(kpis.length))}</span>
      </div>
      <div className="catalogue-layout">
        <TreePanel
          mode={mode}
          domains={domainTree(catalog.kpis, catalog.domains)}
          sources={sourceTree(catalog.kpis, catalog.sources)}
          selected={mode === "domain" ? sel.domain : sel.source}
          onMode={onMode}
          onSelect={onSelect}
          lang={lang}
        />
        <KpiGrid kpis={kpis} units={units} sources={sources} latest={latest} loading={false} error={null} lang={lang} />
      </div>
    </div>
  );
}

/** /catalogue: loads catalog.json; the selection lives in the URL (?domain=, ?source=, ?q=). */
/** Every KPI's latest.json (KPIs in NO_LATEST and failed loads map to null), loaded together. */
function loadLatest(keys: string[]): Promise<Record<string, KpiLatest | null>> {
  return Promise.all(
    keys.map((k): Promise<[string, KpiLatest | null]> =>
      NO_LATEST.includes(k)
        ? Promise.resolve([k, null])
        : api.kpiLatest(k).then(
            (x): [string, KpiLatest | null] => [k, x],
            () => [k, null],
          ),
    ),
  ).then(Object.fromEntries);
}

export function KpiCatalogue({ lang = "en" }: { lang?: Lang }) {
  const data = useData("published-catalog", api.publishedCatalog);
  const keys = data.data?.kpis.map((k) => k.kpi_key) ?? [];
  const latest = useData(keys.length ? `kpi-latest-all:${keys.join(",")}` : null, () => loadLatest(keys));
  const url = useLocation();
  const [q, setQ] = useState(url.searchParams.get("q") ?? "");
  const base = parseCatalogueParams(url.searchParams);
  const [mode, setMode] = useState<TreeMode>(base.source ? "source" : "domain");

  function go(next: CatalogueSelection) {
    const p = catalogueParams(next).toString();
    navigate(p ? `/catalogue?${p}` : "/catalogue");
  }
  function onSelect(key?: string) {
    go({ q, domain: mode === "domain" ? key : undefined, source: mode === "source" ? key : undefined });
  }
  function onMode(m: TreeMode) {
    setMode(m);
    go({ q });
  }
  function onSearch(v: string) {
    setQ(v);
    const p = catalogueParams({ ...base, q: v }).toString();
    window.history.replaceState(null, "", p ? `/catalogue?${p}` : "/catalogue");
  }

  if (data.error) {
    return (
      <div className="page">
        <p className="error" role="alert">
          {data.error}
        </p>
      </div>
    );
  }
  if (!data.data) {
    return (
      <div className="page">
        <KpiGrid kpis={undefined} units={{}} sources={{}} loading error={null} lang={lang} />
      </div>
    );
  }
  return (
    <KpiCatalogueBody
      catalog={data.data}
      sel={{ ...base, q }}
      mode={mode}
      onMode={onMode}
      onSelect={onSelect}
      onSearch={onSearch}
      latest={latest.data ?? {}}
      lang={lang}
    />
  );
}
