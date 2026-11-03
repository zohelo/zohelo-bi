// Przewodnik (the guide): the zohelo design template's rules as pages, each rule next to a live example
// built from the same blocks the portal uses. /przewodnik is the index, /przewodnik/<section> one page.

import { useEffect, type ReactNode } from "react";
import { Link } from "../../router";
import { useMeta, usePage } from "../context";
import { PageHeader } from "../ui/blocks";
import { findSection, GUIDE_TITLE, neighbours, sectionName, sectionPath } from "./sections";
import { IndexPage } from "./IndexPage";
import { BrandPage } from "./BrandPage";
import { ColorTypePage } from "./ColorTypePage";
import { LayoutPage } from "./LayoutPage";
import { MenuPage } from "./MenuPage";
import { DashboardPage } from "./DashboardPage";
import { ChartsPage } from "./ChartsPage";
import { ComponentsPage } from "./ComponentsPage";
import { ContentPage } from "./ContentPage";
import { AccessibilityPage } from "./AccessibilityPage";
import { BuildingPage } from "./BuildingPage";
import { MethodologyPage } from "./MethodologyPage";
import "./guide.css";

const PAGES: Record<string, () => ReactNode> = {
  marka: () => <BrandPage />,
  "kolory-i-typografia": () => <ColorTypePage />,
  uklad: () => <LayoutPage />,
  menu: () => <MenuPage />,
  pulpit: () => <DashboardPage />,
  wykresy: () => <ChartsPage />,
  komponenty: () => <ComponentsPage />,
  tresci: () => <ContentPage />,
  dostepnosc: () => <AccessibilityPage />,
  "tworzenie-i-testy": () => <BuildingPage />,
  metodologia: () => <MethodologyPage />,
};

export function GuidePage({ section }: { section: string | null }) {
  const { lang, url } = usePage();
  const pl = lang === "pl";
  const sec = findSection(section);
  const missing = section !== null && (!sec || !PAGES[section]);
  const guide = GUIDE_TITLE[lang];
  const title = missing
    ? pl
      ? "Nie ma takiej części przewodnika"
      : "No such guide page"
    : sec
      ? sectionName(sec, lang)
      : pl
        ? "Przewodnik po szablonie zohelo"
        : "The zohelo design template guide";
  useMeta(title, section === null ? [{ label: guide }] : [{ label: guide, to: "/przewodnik" }, { label: title }], [lang]);

  // Deep links (#wykres-line-band): scroll once the section has rendered.
  useEffect(() => {
    if (!url.hash) return;
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    el?.scrollIntoView({ block: "start" });
  }, [url.hash]);

  const lead = missing
    ? pl
      ? `Adres ${url.pathname} nie prowadzi do żadnej części przewodnika. Wybierz część z listy.`
      : `${url.pathname} is not a page of the guide. Pick a page from the list.`
    : sec
      ? pl
        ? sec.sumPl
        : sec.sumEn
      : pl
        ? "Jedna instrukcja dla bi.zohelo.com, data.zohelo.com i zohelo.com: marka, układ, pulpity, wykresy, komponenty, treści i dostępność. Każda zasada ma obok żywy przykład z tych samych elementów, z których zbudowany jest portal."
        : "One manual for bi.zohelo.com, data.zohelo.com and zohelo.com: brand, layout, dashboards, charts, components, content and accessibility. Every rule sits next to a live example built from the same parts as the portal.";

  return (
    <>
      <PageHeader title={title} lead={lead} />
      <div className="g-body">
        {missing ? <GuideMissing /> : section === null ? <IndexPage /> : PAGES[section]!()}
        {missing ? null : <PrevNext current={section} />}
      </div>
    </>
  );
}

function PrevNext({ current }: { current: string | null }) {
  const { lang } = usePage();
  const pl = lang === "pl";
  const { prev, next } = neighbours(current);
  const nameOf = (slug: string | null) => {
    if (slug === null) return pl ? "Wprowadzenie" : "Introduction";
    const s = findSection(slug);
    return s ? sectionName(s, lang) : slug;
  };
  if (prev === undefined && next === undefined) return null;
  return (
    <nav className="g-prevnext" aria-label={pl ? "Poprzednia i następna część" : "Previous and next page"}>
      {prev !== undefined ? (
        <Link to={sectionPath(prev)} className="g-prevnext__link g-prevnext__link--prev" rel="prev">
          <span className="g-prevnext__dir">{pl ? "Poprzednia" : "Previous"}</span>
          <span className="g-prevnext__name">{nameOf(prev)}</span>
        </Link>
      ) : (
        <span />
      )}
      {next !== undefined ? (
        <Link to={sectionPath(next)} className="g-prevnext__link g-prevnext__link--next" rel="next">
          <span className="g-prevnext__dir">{pl ? "Następna" : "Next"}</span>
          <span className="g-prevnext__name">{nameOf(next)}</span>
        </Link>
      ) : null}
    </nav>
  );
}

function GuideMissing() {
  const { lang } = usePage();
  const pl = lang === "pl";
  return (
    <section className="zt-card g-missing" aria-labelledby="g-missing-h">
      <h2 id="g-missing-h" className="card-title">
        {pl ? "Dokąd dalej" : "Where to next"}
      </h2>
      <ul className="g-missing__list">
        <li>
          <Link to="/przewodnik">{pl ? "Wprowadzenie do przewodnika" : "Guide introduction"}</Link>
        </li>
        <li>
          <Link to="/przewodnik/wykresy">{pl ? "Biblioteka wykresów" : "Chart library"}</Link>
        </li>
        <li>
          <Link to="/">{pl ? "Strona główna" : "Home"}</Link>
        </li>
      </ul>
      <p className="g-muted">
        {pl ? "Części przewodnika są też w menu bocznym, pod pozycją Przewodnik." : "The guide pages are also in the sidebar, under Guide."}
      </p>
    </section>
  );
}
