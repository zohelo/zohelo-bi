// App shell of the zohelo design template (design system: AppShell, Sidebar, TopBar, Footer).
// Sidebar 256px; icon rail below 1280px or when collapsed; drawer below 768px. The whole sidebar is the
// "Główna" nav landmark: Strona główna, Eksplorator danych, Katalog danych, Dashboardy (→ domains → pages),
// Przewodnik (→ groups of guide pages). Top bar: breadcrumb, then data date, language and account. The
// footer stays at the bottom of the window, level with the sidebar's footer.

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import type { Catalog } from "../../data";
import { domainIcon, Icon, Mark, type IconName } from "../ui/icons";
import { StatusTag } from "../ui/blocks";
import { GUIDE_GROUPS, GUIDE_SECTIONS, sectionPath } from "../guide/sections";
import { SideSearch } from "./SideSearch";
import { usePersonal } from "../usePersonal";
import { AccountButton, APP_VERSION, DataStamp, LangMenu } from "./HeaderTools";
import { dashboardFor } from "../dashboard/load";

export type Crumb = { label: string; to?: string };

const COLLAPSE_KEY = "zohelo-bi.sidebar-collapsed.v1";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/** True while the media query matches (re-renders on change). */
function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function AppShell({
  lang,
  setLang,
  catalog,
  path,
  crumbs,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  catalog: Catalog | undefined;
  path: string;
  crumbs: Crumb[];
  children: ReactNode;
}) {
  const pl = lang === "pl";
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const phone = useMedia("(max-width: 767px)");
  const narrow = useMedia("(max-width: 1279px)");
  const rail = !phone && (narrow || collapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage blocked: the choice lasts for this page view */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const domains = (catalog?.domains ?? []).filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const groupsOf = (key: string) =>
    (catalog?.domains ?? []).filter((d) => d.level === "group" && d.parent_key === key).sort((a, b) => a.sort - b.sort);
  const activeDomain = /^\/d\/([a-z_]+)/.exec(path)?.[1];
  // The cross-domain summary (dashboards/domains/poland.yaml) leads the dashboards list.
  const summaryDash = dashboardFor("poland");
  const summaryName = summaryDash ? (pl ? summaryDash.title_pl : summaryDash.title_en) : "";
  const inGuide = path.startsWith("/przewodnik");
  const guideIntro = path === "/przewodnik";
  // Everything starts collapsed; opening a domain page (or a guide page other than the introduction) unfolds
  // the way to it. The landing pages (Dashboardy, Przewodnik) do not unfold anything.
  const [openDomain, setOpenDomain] = useState<string | undefined>(activeDomain);
  const [boardsOpen, setBoardsOpen] = useState(!!activeDomain);
  const [guideOpen, setGuideOpen] = useState(inGuide && !guideIntro);
  // Close the drawer and follow the active page when the path changes (reset during render, not in an effect).
  const [shownPath, setShownPath] = useState(path);
  if (path !== shownPath) {
    setShownPath(path);
    setDrawer(false);
    if (activeDomain) {
      setOpenDomain(activeDomain);
      setBoardsOpen(true);
    }
    if (inGuide && !guideIntro) setGuideOpen(true);
  }
  // The deepest visible item of the current page is the one marked (never a parent and its child together).
  const onHome = path === "/";
  const { role } = usePersonal();
  const boardsCurrent = path === "/d" || (!!activeDomain && !boardsOpen);
  const guideCurrent = inGuide && !guideOpen;
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);

  const top = [
    { to: "/", label: pl ? "Strona główna" : "Home", icon: "home" as const, on: onHome, reading: false },
    {
      to: "/explore",
      label: pl ? "Eksplorator danych" : "Data explorer",
      icon: "explore" as const,
      on: path.startsWith("/explore"),
      reading: false,
    },
    {
      to: "/analizy",
      label: pl ? "Analizy" : "Analyses",
      icon: "analysis" as const,
      on: path.startsWith("/analizy"),
      reading: false,
    },
  ];
  const lower = [
    {
      to: "/catalogue",
      label: pl ? "Katalog danych" : "Data catalogue",
      icon: "catalog" as const,
      on: path.startsWith("/catalogue") || path.startsWith("/kpi/"),
      reading: false,
    },
  ];
  const navLink = (t: { to: string; label: string; icon: IconName; on: boolean; reading: boolean }) => (
    <Link
      key={t.to}
      to={t.to}
      className="zt-nav-item"
      aria-current={t.on ? "page" : undefined}
      data-reading={t.reading || undefined}
      title={rail ? t.label : undefined}
    >
      <Icon name={t.icon} />
      <span className="t-label">{t.label}</span>
    </Link>
  );
  const boardsLabel = pl ? "Dashboardy" : "Dashboards";
  const guideLabel = pl ? "Przewodnik" : "Guide";
  const guidePath = (slug: string | null) => sectionPath(slug);

  return (
    <div className={`t-app${collapsed ? " t-app--collapsed" : ""}${drawer ? " t-app--drawer" : ""}`}>
      <a className="t-skip" href="#tresc">
        {pl ? "Przejdź do treści" : "Skip to content"}
      </a>
      {drawer ? <div className="t-scrim" aria-hidden="true" onClick={() => setDrawer(false)} /> : null}
      <nav className="t-side" aria-label={pl ? "Główna" : "Main"}>
        <div className="t-side__brand">
          <Link to="/" className="t-brand" aria-label={rail ? "zohelo bi" : undefined}>
            <Mark />
            <span className="t-label t-brand__word">zohelo</span> <span className="t-label t-brand__product">bi</span>
          </Link>
          <button
            className="zt-btn zt-btn--icon t-side__collapse"
            type="button"
            aria-label={collapsed ? (pl ? "Rozwiń menu" : "Expand menu") : pl ? "Zwiń menu" : "Collapse menu"}
            aria-expanded={!collapsed}
            aria-controls="t-menu"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Icon name={collapsed ? "expand" : "collapse"} />
          </button>
          <button
            className="zt-btn zt-btn--icon t-side__close"
            type="button"
            aria-label={pl ? "Zamknij menu" : "Close menu"}
            onClick={() => setDrawer(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <SideSearch lang={lang} catalog={catalog} compact={rail} onPhoneOpen={() => setDrawer(true)} />
        <div id="t-menu" className="t-side__menu">
          <div className="t-navgroup">
            {top.map(navLink)}

            <div className="t-navrow">
              <Link
                to="/d"
                className="zt-nav-item t-navrow__link"
                aria-current={boardsCurrent ? "page" : undefined}
                title={rail ? boardsLabel : undefined}
              >
                <Icon name="dashboards" />
                <span className="t-label t-grow">{boardsLabel}</span>
              </Link>
              <button
                type="button"
                className="zt-btn zt-btn--icon t-navrow__toggle t-hide-rail"
                aria-label={`${boardsOpen ? (pl ? "Zwiń" : "Collapse") : pl ? "Rozwiń" : "Expand"}: ${boardsLabel}`}
                aria-expanded={boardsOpen}
                aria-controls="t-boards"
                onClick={() => setBoardsOpen(!boardsOpen)}
              >
                <Icon name={boardsOpen ? "chevronDown" : "chevronRight"} size={14} />
              </button>
            </div>
            {boardsOpen ? (
              <div className="t-boards" id="t-boards">
                {summaryDash ? (
                  <div className="t-navrow">
                    <Link
                      to="/d/poland"
                      className="zt-nav-item t-navrow__link"
                      aria-current={path === "/d/poland" ? "page" : undefined}
                      title={rail ? summaryName : undefined}
                      data-active={activeDomain === "poland" || undefined}
                    >
                      <Icon name="poland" />
                      <span className="t-label t-grow">{summaryName}</span>
                    </Link>
                  </div>
                ) : null}
                {domains.map((d) => {
                  const open = openDomain === d.domain_key;
                  const groups = groupsOf(d.domain_key);
                  const subId = `t-sub-${d.domain_key}`;
                  const overview = `/d/${d.domain_key}`;
                  return (
                    <div key={d.domain_key}>
                      <div className="t-navrow">
                        <Link
                          to={overview}
                          className="zt-nav-item t-navrow__link"
                          aria-current={activeDomain === d.domain_key && !open ? "page" : undefined}
                          title={rail ? name(d) : undefined}
                          data-active={activeDomain === d.domain_key || undefined}
                        >
                          <Icon name={domainIcon(d.domain_key)} />
                          <span className="t-label t-grow">{name(d)}</span>
                        </Link>
                        <button
                          type="button"
                          className="zt-btn zt-btn--icon t-navrow__toggle t-hide-rail"
                          aria-label={`${open ? (pl ? "Zwiń" : "Collapse") : pl ? "Rozwiń" : "Expand"}: ${name(d)}`}
                          aria-expanded={open}
                          aria-controls={subId}
                          onClick={() => setOpenDomain(open ? undefined : d.domain_key)}
                        >
                          <Icon name={open ? "chevronDown" : "chevronRight"} size={14} />
                        </button>
                      </div>
                      {open ? (
                        <div className="zt-nav-sub t-hide-rail" id={subId}>
                          <Link to={overview} className="zt-nav-item" aria-current={path === overview ? "page" : undefined}>
                            {pl ? "Przegląd" : "Overview"}
                          </Link>
                          {groups.map((g) => {
                            const to = `/d/${d.domain_key}/${g.domain_key.split(".")[1]}`;
                            return (
                              <Link key={g.domain_key} to={to} className="zt-nav-item" aria-current={path === to ? "page" : undefined}>
                                {name(g)}
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            {lower.map(navLink)}
          </div>
          {role === "admin" ? (
            <div className="t-navgroup">
              <h2 className="zt-nav-group t-hide-rail">{pl ? "Administracja" : "Admin"}</h2>
              <div className="t-navrow">
                <Link
                  to="/przewodnik"
                  className="zt-nav-item t-navrow__link"
                  aria-current={guideCurrent ? "page" : undefined}
                  title={rail ? guideLabel : undefined}
                >
                  <Icon name="guide" />
                  <span className="t-label t-grow">{guideLabel}</span>
                </Link>
                <button
                  type="button"
                  className="zt-btn zt-btn--icon t-navrow__toggle t-hide-rail"
                  aria-label={`${guideOpen ? (pl ? "Zwiń" : "Collapse") : pl ? "Rozwiń" : "Expand"}: ${guideLabel}`}
                  aria-expanded={guideOpen}
                  aria-controls="t-guide"
                  onClick={() => setGuideOpen(!guideOpen)}
                >
                  <Icon name={guideOpen ? "chevronDown" : "chevronRight"} size={14} />
                </button>
              </div>
              {guideOpen ? (
                <div className="zt-nav-sub t-hide-rail" id="t-guide">
                  <Link to={guidePath(null)} className="zt-nav-item" aria-current={path === "/przewodnik" ? "page" : undefined}>
                    {pl ? "Wprowadzenie" : "Introduction"}
                  </Link>
                  {GUIDE_GROUPS.map((g) => (
                    <div key={g.key} className="t-subgroup" role="group" aria-labelledby={`t-gg-${g.key}`}>
                      <span className="t-subgroup__label" id={`t-gg-${g.key}`}>
                        {pl ? g.pl : g.en}
                      </span>
                      {GUIDE_SECTIONS.filter((s) => s.group === g.key).map((s) => {
                        const to = guidePath(s.slug);
                        return (
                          <Link key={s.slug} to={to} className="zt-nav-item" aria-current={path === to ? "page" : undefined}>
                            {pl ? s.pl : s.en}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="t-side__foot">
          <span className="t-label">zohelo bi</span>
          <span className="t-label t-side__ver">
            {pl ? "wersja " : "version "}
            {APP_VERSION}
          </span>
        </div>
      </nav>
      <div className="t-mainwrap">
        <header className="t-top">
          <button
            ref={menuButton}
            className="zt-btn zt-btn--icon t-top__menu"
            type="button"
            aria-label={pl ? "Otwórz menu" : "Open menu"}
            aria-expanded={drawer}
            aria-controls="t-menu"
            onClick={() => setDrawer(true)}
          >
            <Icon name="menu" />
          </button>
          <nav className="zt-crumb t-crumb" aria-label={pl ? "Ścieżka" : "Breadcrumb"}>
            {crumbs.map((c, i) => (
              <span key={i} className="t-crumb__item">
                {i > 0 ? <span aria-hidden="true">/</span> : null}
                {c.to && i < crumbs.length - 1 ? (
                  <Link to={c.to}>{c.label}</Link>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>
                )}
              </span>
            ))}
          </nav>
          <div className="t-top__actions">
            <DataStamp lang={lang} catalog={catalog} />
            <LangMenu lang={lang} setLang={setLang} />
            <AccountButton lang={lang} />
          </div>
        </header>
        <main id="tresc" className="t-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="t-foot">
          {catalog?.sample ? (
            <StatusTag kind="sample">
              {pl ? "Dane przykładowe" : "Sample data"}
              <span className="t-foot__more">{pl ? ": wszystkie wartości są syntetyczne" : ": every value is synthetic"}</span>
            </StatusTag>
          ) : null}
          <span className="t-foot__src">
            {pl ? "Źródła: " : "Sources: "}GUS, Eurostat, NBP, OECD, {pl ? "Bank Światowy" : "World Bank"}
          </span>
          <Link to="/przewodnik/metodologia" className="t-foot__link">
            {pl ? "Metodologia" : "Methodology"}
          </Link>
        </footer>
      </div>
    </div>
  );
}
