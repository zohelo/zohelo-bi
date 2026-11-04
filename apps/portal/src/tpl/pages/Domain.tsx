// Domain dashboard: /d/<domain> (the domain overview) and /d/<domain>/<page> (one page per domain group),
// drawn from dashboards/domains/<domain>.yaml (format v3, docs/dashboards.md). Downloads live in the explorer;
// each chart copies itself (image or table) from its card.

import { useEffect } from "react";
import { Link } from "../../router";
import { recordVisit } from "../personal";
import { useMeta, usePage } from "../context";
import { dashboardFor } from "../dashboard/load";
import { DashboardView } from "../dashboard/DashboardView";
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
  const root = { label: pl ? "Dashboardy" : "Dashboards", to: "/d" };
  const crumbs = pg ? [root, { label: domainTitle, to: `/d/${domain}` }, { label: title }] : [root, { label: title }];

  useMeta(title, crumbs, [lang, missing, domainTitle]);
  useEffect(() => {
    if (!missing)
      recordVisit({
        id: `page:${url.pathname}`,
        label: pg ? `${domainTitle}: ${title}` : domainTitle,
        to: url.pathname,
        kind: "dashboard",
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per page
  }, [url.pathname, missing]);

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
  return <DashboardView key={pg?.id ?? "overview"} dash={dash} page={pg} cat={catalog} lang={lang} url={url} />;
}
