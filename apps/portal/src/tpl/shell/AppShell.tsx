// App shell of the zohelo design template (design system: AppShell, Sidebar, TopBar, Footer).
// Sidebar 256px; icon rail below 1280px; drawer below 768px. The whole sidebar is the "Główna" nav landmark.

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Lang } from "../../i18n";
import { Link, navigate } from "../../router";
import type { Catalog } from "../../data";
import { domainIcon, Icon, Mark } from "../ui/icons";
import { Sr, StatusTag } from "../ui/blocks";
import { CommandPalette } from "./CommandPalette";

export type Crumb = { label: string; to?: string };

const COLLAPSE_KEY = "zohelo-bi.sidebar-collapsed.v1";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppShell({
  lang,
  setLang,
  catalog,
  path,
  crumbs,
  actions,
  children,
}: {
  lang: Lang;
  setLang: (l: Lang) => void;
  catalog: Catalog | undefined;
  path: string;
  crumbs: Crumb[];
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pl = lang === "pl";
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
      /* storage blocked: the choice lasts for this page view */
    }
  }, [collapsed]);

  // Close the drawer and follow the active domain when the page changes (reset during render, not in an effect).
  const [shownPath, setShownPath] = useState(path);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(true);
      }
      if (e.key === "Escape" && drawer) {
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
  const [openDomain, setOpenDomain] = useState<string | undefined>(activeDomain);
  if (path !== shownPath) {
    setShownPath(path);
    setDrawer(false);
    setOpenDomain(activeDomain);
  }
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);

  const top = [
    { to: "/", label: pl ? "Przegląd" : "Overview", icon: "home" as const, on: path === "/" },
    { to: "/explore", label: pl ? "Eksplorator" : "Explorer", icon: "explore" as const, on: path.startsWith("/explore") },
    {
      to: "/catalogue",
      label: pl ? "Katalog wskaźników" : "Indicator catalogue",
      icon: "catalog" as const,
      on: path.startsWith("/catalogue") || path.startsWith("/kpi/"),
    },
  ];

  return (
    <div className={`t-app${collapsed ? " t-app--collapsed" : ""}${drawer ? " t-app--drawer" : ""}`}>
      <a className="t-skip" href="#tresc">
        {pl ? "Przejdź do treści" : "Skip to content"}
      </a>
      {drawer ? <div className="t-scrim" aria-hidden="true" onClick={() => setDrawer(false)} /> : null}
      <nav className="t-side" aria-label={pl ? "Główna" : "Main"}>
        <div className="t-side__brand">
          <Link to="/" className="t-brand">
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
        <div className="t-side__search" role="search">
          <button type="button" className="zt-search t-searchbtn" onClick={() => setPalette(true)}>
            <Icon name="search" size={16} />
            <span className="t-label">{pl ? "Szukaj wskaźnika" : "Search indicators"}</span>
            <kbd className="zt-kbd t-label">Ctrl K</kbd>
          </button>
        </div>
        <div id="t-menu" className="t-side__menu">
          <div className="t-navgroup">
            {top.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="zt-nav-item"
                aria-current={t.on ? "page" : undefined}
                title={collapsed ? t.label : undefined}
              >
                <Icon name={t.icon} />
                <span className="t-label">{t.label}</span>
              </Link>
            ))}
          </div>
          <div className="t-navgroup">
            <h2 className="zt-nav-group t-hide-rail">{pl ? "Dziedziny" : "Domains"}</h2>
            {domains.map((d) => {
              const open = openDomain === d.domain_key;
              const groups = groupsOf(d.domain_key);
              const subId = `t-sub-${d.domain_key}`;
              return (
                <div key={d.domain_key}>
                  <button
                    type="button"
                    className="zt-nav-item"
                    aria-expanded={open}
                    aria-controls={subId}
                    title={collapsed ? name(d) : undefined}
                    style={{ fontWeight: activeDomain === d.domain_key ? 600 : undefined }}
                    onClick={() => {
                      if (collapsed) {
                        navigate(`/d/${d.domain_key}`);
                        return;
                      }
                      setOpenDomain(open ? undefined : d.domain_key);
                    }}
                  >
                    <Icon name={domainIcon(d.domain_key)} />
                    <span className="t-label t-grow">{name(d)}</span>
                    <span className="t-label t-chev" aria-hidden="true">
                      <Icon name={open ? "chevronDown" : "chevronRight"} size={14} />
                    </span>
                  </button>
                  {open ? (
                    <div className="zt-nav-sub t-hide-rail" id={subId}>
                      <Link
                        to={`/d/${d.domain_key}`}
                        className="zt-nav-item"
                        aria-current={path === `/d/${d.domain_key}` ? "page" : undefined}
                      >
                        {pl ? "Przegląd dziedziny" : "Domain overview"}
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
          <div className="t-navgroup">
            <h2 className="zt-nav-group t-hide-rail">{pl ? "Przewodnik" : "Guide"}</h2>
            <Link
              to="/przewodnik"
              className="zt-nav-item"
              aria-current={path.startsWith("/przewodnik") ? "page" : undefined}
              title={collapsed ? (pl ? "Zasady i biblioteka wykresów" : "Rules and chart library") : undefined}
            >
              <Icon name="guide" />
              <span className="t-label">{pl ? "Zasady i biblioteka wykresów" : "Rules and chart library"}</span>
            </Link>
          </div>
        </div>
        <div className="t-side__foot">
          <Link
            to="/przewodnik/metodologia"
            className="zt-nav-item"
            title={collapsed ? (pl ? "Metodologia i źródła" : "Methodology and sources") : undefined}
          >
            <Icon name="doc" />
            <span className="t-label">{pl ? "Metodologia i źródła" : "Methodology and sources"}</span>
          </Link>
          <div className="t-side__footrow t-hide-rail">
            {catalog?.sample ? <StatusTag kind="sample">{pl ? "Dane przykładowe" : "Sample data"}</StatusTag> : <span />}
            <div className="zt-seg zt-seg--sm" role="group" aria-label={pl ? "Język" : "Language"}>
              <button type="button" aria-pressed={lang === "pl"} onClick={() => setLang("pl")}>
                PL
              </button>
              <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
                EN
              </button>
            </div>
          </div>
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
          <div className="t-top__actions">{actions}</div>
        </header>
        <main id="tresc" className="t-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="t-foot">
          {pl ? "Dane: " : "Data: "}Eurostat, GUS, NBP, {pl ? "Bank Światowy" : "World Bank"}
          {catalog?.sample ? (
            <>
              {" · "}
              <strong>{pl ? "wszystkie wartości są przykładowe" : "all values are sample data"}</strong>
            </>
          ) : null}
          {" · "}
          <Link to="/przewodnik/metodologia">{pl ? "Metodologia" : "Methodology"}</Link>
          {" · "}
          {pl ? "Wersja danych " : "Data version "}
          {catalog?.generated_at.slice(0, 10) ?? "–"}
          <Sr>.</Sr>
        </footer>
      </div>
      {palette ? <CommandPalette lang={lang} catalog={catalog} onClose={() => setPalette(false)} /> : null}
    </div>
  );
}
