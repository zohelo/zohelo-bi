// A domain dashboard page drawn from its YAML (format v3): a sticky header (title, Pobierz dane, section
// navigation), then lead, filter bar, KPI row and sections of chart cards in the 12-column grid, each section
// sized to the window; group pages end with the neighbouring pages. Periods are chosen on each time chart.
// Nothing here is specific to a domain: the files decide, including the sections the navigation offers.

import { useId } from "react";
import type { DashboardV3, V3Overview, V3Page } from "@zohelo/semantic";
import type { Catalog } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { StickyPageHead, type NavTarget } from "../ui/SectionNav";
import { DashCard } from "./DashCard";
import { FilterBar } from "./FilterBar";
import { KpiRow } from "./KpiRow";
import { pageKpiKeys, readState } from "./state";
import "./dashboard.css";

/** "3 wskaźniki", "5 wskaźników", "1 indicator". */
export function DashboardView({
  dash,
  page,
  cat,
  lang,
  url,
}: {
  dash: DashboardV3;
  page: V3Page | null;
  cat: Catalog;
  lang: Lang;
  url: URL;
}) {
  const pl = lang === "pl";
  const base = useId();
  const view: V3Overview | V3Page = page ?? dash.overview;
  const filters = (view.filters ?? []).filter((f) => f !== "period");
  const state = readState(url.searchParams, filters, cat);
  const keys = pageKpiKeys(view.kpis, view.sections);
  const kpis = keys.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is NonNullable<typeof k> => !!k);
  const title = page ? (pl ? page.title_pl : page.title_en) : pl ? dash.title_pl : dash.title_en;
  const lead = pl ? view.lead_pl : view.lead_en;
  const idx = page ? dash.pages.indexOf(page) : -1;
  const prev = idx > 0 ? dash.pages[idx - 1] : undefined;
  const next = idx >= 0 && idx < dash.pages.length - 1 ? dash.pages[idx + 1] : undefined;
  const pageTitle = (p: V3Page) => (pl ? p.title_pl : p.title_en);
  const keep = url.search; // filters carry over to neighbouring pages
  const sections = view.sections ?? [];
  const secId = (s: { id?: string }, i: number) => `sec-${s.id ?? i + 1}`;
  // A section of tables only (sparkline table, scorecard) keeps its natural height: stretched, it left an empty band.
  const isTable = (c: { chart: string }) => c.chart === "sparkline-table" || c.chart === "scorecard";
  // A card marked hide_when_absent is left out while its KPI is not published (EUR/PLN, decision O37).
  const shown = <C extends { kpi: string; hide_when_absent?: boolean }>(cards: C[]) =>
    cards.filter((c) => !c.hide_when_absent || cat.kpis.some((k) => k.kpi_key === c.kpi));
  const grows = (s: (typeof sections)[number]) => s.cards.some((c) => !isTable(c));
  const screen = (s: (typeof sections)[number] | undefined) => `t-screen${s && !grows(s) ? " t-screen--natural" : ""}`;
  const targets: NavTarget[] = [
    ...(kpis.length ? [{ id: "sec-kpis", label: pl ? "Najważniejsze liczby" : "Key figures" }] : []),
    ...sections.map((s, i) => ({
      id: secId(s, i),
      label: (pl ? (s.nav_pl ?? s.title_pl) : (s.nav_en ?? s.title_en)) as string,
    })),
  ];
  const section = (s: (typeof sections)[number], i: number) => (
    <section key={i} id={secId(s, i)} className={`t-section${grows(s) ? " t-section--fill" : ""}`} aria-labelledby={`${base}-s${i}`}>
      <h2 id={`${base}-s${i}`} className="section-title">
        {pl ? s.title_pl : s.title_en}
      </h2>
      {(pl ? s.lead_pl : s.lead_en) ? <p className="small t-seclead">{pl ? s.lead_pl : s.lead_en}</p> : null}
      {grows(s) && shown(s.cards).some(isTable) ? (
        // Tables (a scorecard opening the section) keep their height; the charts below share the rest.
        <div className="t-grid t-grid--tables">
          {shown(s.cards).map((c, j) =>
            isTable(c) ? <DashCard key={`${i}-${j}-${c.kpi}-${c.chart}`} card={c} cat={cat} lang={lang} state={state} /> : null,
          )}
        </div>
      ) : null}
      <div className={`t-grid${grows(s) ? " t-grid--fill" : ""}`}>
        {shown(s.cards).map((c, j) =>
          grows(s) && isTable(c) ? null : <DashCard key={`${i}-${j}-${c.kpi}-${c.chart}`} card={c} cat={cat} lang={lang} state={state} />,
        )}
      </div>
    </section>
  );

  return (
    <>
      <StickyPageHead title={title} targets={targets} navLabel={pl ? "Sekcje strony" : "Page sections"}>
        {lead ? <p className="body-l t-lead t-dlead">{lead}</p> : null}
        {filters.length ? <FilterBar filters={filters} state={state} kpis={kpis} cat={cat} lang={lang} url={url} /> : null}
      </StickyPageHead>
      {/* Each screen fills the window between the sticky header and the footer: the KPI row shares the first
          screen with the first section; every further section is a screen of its own. */}
      <div className={screen(sections[0])}>
        <KpiRow tiles={view.kpis} cat={cat} lang={lang} geo={state.geo} labelId={`${base}-kpis`} id="sec-kpis" />
        {sections[0] ? section(sections[0], 0) : null}
      </div>
      {sections.slice(1).map((s, i) => (
        <div key={i + 1} className={screen(s)}>
          {section(s, i + 1)}
        </div>
      ))}
      {page ? (
        <nav className="t-dpager" aria-label={pl ? "Strony dziedziny" : "Domain pages"}>
          {prev ? (
            <Link to={`/d/${dash.domain_key}/${prev.id}${keep}`} className="t-dpager__link">
              <small>{pl ? "Poprzednia strona" : "Previous page"}</small>
              {pageTitle(prev)}
            </Link>
          ) : (
            <Link to={`/d/${dash.domain_key}${keep}`} className="t-dpager__link">
              <small>{pl ? "Wróć do" : "Back to"}</small>
              {pl ? `Przegląd: ${dash.title_pl}` : `Overview: ${dash.title_en}`}
            </Link>
          )}
          {next ? (
            <Link to={`/d/${dash.domain_key}/${next.id}${keep}`} className="t-dpager__link t-dpager__link--next">
              <small>{pl ? "Następna strona" : "Next page"}</small>
              {pageTitle(next)}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </>
  );
}
