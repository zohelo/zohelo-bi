// Domain dashboard: /d/<domain> (the domain overview) and /d/<domain>/<page> (one page per domain group),
// drawn from dashboards/domains/<domain>.yaml (format v3, docs/dashboards.md). The page header carries Pobierz
// dane (every series of the page as CSV).

import { data } from "../../data";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { dashboardFor } from "../dashboard/load";
import { DashboardView } from "../dashboard/DashboardView";
import { downloadText, toCsv } from "../dashboard/csv";
import { pageKpiKeys, readState } from "../dashboard/state";
import { geoName, kpiName, sourceName } from "../chartData";
import { PageHeader } from "../ui/blocks";

export function DomainPage({ domain, page }: { domain: string; page: string | null }) {
  const { lang, catalog, url } = usePage();
  const pl = lang === "pl";
  const dash = dashboardFor(domain);
  const pg = dash && page ? (dash.pages.find((p) => p.id === page) ?? null) : null;
  const missing = !dash || (page !== null && !pg);
  const catDomain = catalog?.domains.find((d) => d.domain_key === domain);
  const domainTitle = dash ? (pl ? dash.title_pl : dash.title_en) : catDomain ? (pl ? catDomain.name_pl : catDomain.name_en) : domain;
  const title = missing ? (pl ? "Nie ma takiego pulpitu" : "No such dashboard") : pg ? (pl ? pg.title_pl : pg.title_en) : domainTitle;
  const root = { label: pl ? "Dashboardy" : "Dashboards", to: "/" };
  const crumbs = pg ? [root, { label: domainTitle, to: `/d/${domain}` }, { label: title }] : [root, { label: title }];

  const view = pg ?? dash?.overview;
  const download = async () => {
    if (!view || !catalog) return;
    const state = readState(url.searchParams, view.filters ?? [], catalog);
    const kpis = pageKpiKeys(view.kpis, view.sections)
      .map((k) => catalog.kpis.find((x) => x.kpi_key === k))
      .filter((k): k is NonNullable<typeof k> => !!k);
    const rows: (string | number | null)[][] = [];
    for (const k of kpis) {
      const geo = state.geo && k.geographies.includes(state.geo) ? state.geo : "PL";
      for (const s of await data.series(k.kpi_key, { geographies: [geo] }))
        for (const p of s.points)
          rows.push([
            k.kpi_key,
            kpiName(k, lang),
            geoName(catalog, s.geography, lang),
            sourceName(catalog, s.source_key, lang),
            p.period,
            p.value,
            k.unit_key,
          ]);
    }
    const meta = [
      `${domainTitle}${pg ? ` / ${title}` : ""}`,
      `${pl ? "Adres" : "Link"}: ${window.location.href}`,
      `${pl ? "Dane z" : "Data as of"}: ${catalog.generated_at.slice(0, 10)}`,
      ...(catalog.sample ? [pl ? "Dane przykładowe (syntetyczne), nie do cytowania" : "Sample (synthetic) data, not for citation"] : []),
    ];
    const header = pl
      ? ["kpi", "wskaźnik", "obszar", "źródło", "okres", "wartość", "jednostka"]
      : ["kpi", "indicator", "area", "source", "period", "value", "unit"];
    downloadText(`zohelo-${domain}${pg ? "-" + pg.id : ""}.csv`, toCsv(meta, header, rows));
  };

  useMeta(title, crumbs, [lang, missing, domainTitle]);

  if (!dash || missing || !catalog)
    return missing ? (
      <>
        <PageHeader
          title={title}
          lead={
            pl
              ? `Dziedzina „${domain}”${page ? ` nie ma strony „${page}”` : " nie ma pulpitu"}. Wybierz dziedzinę z listy po lewej lub wróć do przeglądu.`
              : `The domain "${domain}"${page ? ` has no page "${page}"` : " has no dashboard"}. Pick a domain on the left or go back to the overview.`
          }
        />
        <p>
          <Link to={dash ? `/d/${domain}` : "/"} className="zt-btn">
            {dash ? (pl ? `Przegląd: ${domainTitle}` : `Overview: ${domainTitle}`) : pl ? "Strona główna" : "Home"}
          </Link>
        </p>
      </>
    ) : (
      <PageHeader title={title} lead={pl ? "Wczytywanie katalogu…" : "Loading the catalogue…"} />
    );
  return (
    <DashboardView
      key={pg?.id ?? "overview"}
      dash={dash}
      page={pg}
      cat={catalog}
      lang={lang}
      url={url}
      onDownload={() => void download()}
    />
  );
}
