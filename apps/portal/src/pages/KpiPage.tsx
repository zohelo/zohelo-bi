import type { ReactNode } from "react";
import type { KpiLatest, PublishedCatalog } from "@zohelo/semantic";
import { relatedKpis } from "@zohelo/semantic";
import { api } from "../api";
import { KpiView } from "../components/KpiView";
import { RelatedKpis } from "../components/RelatedKpis";
import { useData } from "../components/useData";
import { t, type Lang } from "../i18n";
import { Link } from "../router";
import { NotFound } from "./NotFound";

// The KPI page at /kpi/<kpi_key>: published catalog.json plus the KPI's latest.json (404 for KPIs
// gold.publish skips, e.g. fx_rate: then the page has no headline value).

export function KpiPageBody({
  catalog,
  kpiKey,
  latest,
  path,
  accessed,
  lang = "en",
  chart,
}: {
  catalog: PublishedCatalog;
  kpiKey: string;
  latest: KpiLatest | null;
  path: string;
  accessed: Date;
  lang?: Lang;
  chart?: ReactNode;
}) {
  if (!catalog.kpis.some((k) => k.kpi_key === kpiKey)) return <NotFound path={path} lang={lang} />;
  return (
    <div className="page">
      <KpiView catalog={catalog} kpiKey={kpiKey} latest={latest ? latest.values : null} accessed={accessed} lang={lang} chart={chart} />
      <RelatedKpis items={relatedKpis(catalog.kpis, kpiKey)} lang={lang} />
      <p>
        <Link to={`/explore?metric=${encodeURIComponent(kpiKey)}`} className="tile-link">
          {t(lang, "dashboard.openInExplorer")}
        </Link>
      </p>
    </div>
  );
}

export function KpiPage({ kpiKey, path, lang = "en", chart }: { kpiKey: string; path: string; lang?: Lang; chart?: ReactNode }) {
  const cat = useData("published-catalog", api.publishedCatalog);
  const lat = useData(`kpi-latest:${kpiKey}`, () => api.kpiLatest(kpiKey));
  if (cat.error)
    return (
      <p className="error" role="alert">
        {cat.error}
      </p>
    );
  if (!cat.data)
    return (
      <p className="hint" aria-busy="true">
        {t(lang, "kpiPage.loading")}
      </p>
    );
  return (
    <KpiPageBody catalog={cat.data} kpiKey={kpiKey} latest={lat.data ?? null} path={path} accessed={new Date()} lang={lang} chart={chart} />
  );
}
