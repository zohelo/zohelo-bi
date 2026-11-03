// Menu boczne: anatomy, item states rendered with the real zt-nav-item styles, rail and drawer, rules.
// The state samples are illustrations (aria-hidden, not focusable); the state column names them in words.

import type { ReactNode } from "react";
import { Link } from "../../router";
import { Icon, Mark, type IconName } from "../ui/icons";
import { Anatomy, DoDont, Example, GSection, Grid, Rules, SpecTable, Tok, useT } from "./parts";

function NavSample({
  icon,
  label,
  cls,
  current,
  disabled,
  bold,
  soon,
}: {
  icon?: IconName;
  label: string;
  cls?: string;
  current?: boolean;
  disabled?: boolean;
  bold?: boolean;
  soon?: string;
}) {
  return (
    <div
      className={`zt-nav-item g-navsample${cls ? " " + cls : ""}`}
      aria-current={current ? "page" : undefined}
      aria-disabled={disabled ? "true" : undefined}
      style={bold ? { fontWeight: 600 } : undefined}
    >
      {icon ? <Icon name={icon} /> : null}
      <span className="t-grow">{label}</span>
      {soon ? <span className="g-soon">{soon}</span> : null}
    </div>
  );
}

export function MenuPage() {
  const { t } = useT();
  const states: { sample: ReactNode; name: string; how: ReactNode }[] = [
    {
      sample: <NavSample icon="economy" label={t("Gospodarka", "Economy")} />,
      name: t("Domyślny", "Default"),
      how: t("Tekst ink, ikona ink-3, przezroczyste tło.", "ink text, ink-3 icon, transparent fill."),
    },
    {
      sample: <NavSample icon="economy" label={t("Gospodarka", "Economy")} cls="g-force-hover" />,
      name: t("Najechanie", "Hover"),
      how: (
        <>
          {t("Tło", "Fill")} <Tok>surface-muted</Tok>.
        </>
      ),
    },
    {
      sample: <NavSample icon="economy" label={t("Gospodarka", "Economy")} cls="g-force-focus" />,
      name: t("Fokus z klawiatury", "Keyboard focus"),
      how: (
        <>
          {t("Pierścień 2 px", "2px ring")} <Tok>focus</Tok>,{" "}
          {t("odsunięty o 2 px. Tylko przy :focus-visible.", "2px offset. Only on :focus-visible.")}
        </>
      ),
    },
    {
      sample: <NavSample icon="economy" label={t("Ceny i inflacja", "Prices and inflation")} current />,
      name: t("Aktywny", "Active"),
      how: (
        <>
          <Tok>accent-tint</Tok>, {t("pasek 3 px", "3px bar")} <Tok>accent</Tok>, {t("waga 600 i", "weight 600 and")}{" "}
          <Tok>aria-current=&quot;page&quot;</Tok>
          {t(": nie sam kolor.", ": never colour alone.")}
        </>
      ),
    },
    {
      sample: <NavSample icon="economy" label={t("Gospodarka", "Economy")} bold />,
      name: t("Rodzic aktywnego", "Parent of active"),
      how: t(
        'Dziedzina, w której jest aktywna strona: waga 600 i rozwinięte strony (jej strzałka ma aria-expanded="true").',
        'The domain holding the active page: weight 600 and its pages expanded (its chevron has aria-expanded="true").',
      ),
    },
    {
      sample: <NavSample icon="health" label={t("Zdrowie", "Health")} disabled soon={t("wkrótce", "soon")} />,
      name: t("Niedostępny", "Unavailable"),
      how: (
        <>
          <Tok>aria-disabled=&quot;true&quot;</Tok>, <Tok>tabindex=&quot;-1&quot;</Tok>,{" "}
          {t("„wkrótce” w ink-muted, ukryty przecinek przed nim.", "“wkrótce” in ink-muted, a hidden comma before it.")}
        </>
      ),
    },
  ];

  return (
    <>
      <GSection
        id="g-anatomy"
        title={t("Budowa", "Anatomy")}
        lead={t(
          "Jedno menu dla bi.zohelo.com i data.zohelo.com. Menu po lewej stronie tego portalu to działający egzemplarz: możesz sprawdzić każdą regułę na nim.",
          "One sidebar for bi.zohelo.com and data.zohelo.com. The sidebar on the left of this portal is a working instance: you can check every rule on it.",
        )}
      >
        <div className="g-split">
          <div className="g-sidemock zt-side" aria-hidden="true">
            <div className="g-sidemock__brand">
              <span className="t-brand">
                <Mark />
                <span className="t-brand__word">zohelo</span> <span className="t-brand__product">bi</span>
              </span>
              <span className="g-n g-n--side">1</span>
            </div>
            <div className="g-sidemock__pad">
              <div className="g-sidemock__group">
                <div className="zt-search">
                  <Icon name="search" size={16} />
                  <span className="t-grow">{t("Szukaj…", "Search…")}</span>
                  <kbd className="zt-kbd">Ctrl K</kbd>
                </div>
                <span className="g-n g-n--side">2</span>
              </div>
              <div className="g-sidemock__group">
                <NavSample icon="home" label={t("Strona główna", "Home")} />
                <NavSample icon="explore" label={t("Eksplorator danych", "Data explorer")} />
                <NavSample icon="catalog" label={t("Katalog danych", "Data catalogue")} />
                <span className="g-n g-n--side">3</span>
              </div>
              <div className="g-sidemock__group">
                <NavSample icon="dashboards" label={t("Dashboardy", "Dashboards")} />
                <span className="g-n g-n--side">4</span>
                <NavSample icon="economy" label={t("Gospodarka", "Economy")} bold />
                <div className="zt-nav-sub">
                  <NavSample label={t("Przegląd", "Overview")} />
                  <NavSample label={t("Ceny i inflacja", "Prices and inflation")} current />
                  <NavSample label={t("Rachunki narodowe i PKB", "National accounts and GDP")} />
                </div>
                <NavSample icon="finance" label={t("Finanse", "Finance")} />
              </div>
              <div className="g-sidemock__group">
                <NavSample icon="guide" label={t("Przewodnik", "Guide")} />
                <span className="g-n g-n--side">5</span>
              </div>
            </div>
            <div className="g-sidemock__foot">
              <span className="g-small">
                zohelo bi <span className="g-muted">{t("wersja 0.9", "version 0.9")}</span>
              </span>
              <span className="g-n g-n--side">6</span>
            </div>
          </div>
          <Anatomy
            items={[
              {
                name: t("Wiersz logo, 60 px.", "Brand row, 60px."),
                text: t(
                  "Logo na żywo + przycisk „Zwiń menu” (aria-expanded, aria-controls). W pasku ikon znak i przycisk „Rozwiń menu” stoją obok siebie.",
                  "Live lockup + “Zwiń menu” (Collapse menu) button (aria-expanded, aria-controls). In the icon rail the mark and the “Rozwiń menu” (Expand menu) button sit side by side.",
                ),
              },
              {
                name: t("Wyszukiwarka.", "Search."),
                text: t(
                  'Pisze się wprost w polu; wyniki (dashboardy, wskaźniki, strony przewodnika) pojawiają się na liście tuż pod nim. Ctrl K przenosi do niej fokus. W role="search".',
                  'Typed straight into the field; matches (dashboards, indicators, guide pages) appear in a list right under it. Ctrl K focuses it. Inside role="search".',
                ),
              },
              {
                name: t("Menu główne.", "Primary items."),
                text: t("Strona główna, Eksplorator danych, Katalog danych.", "Home, Data explorer, Data catalogue."),
              },
              {
                name: t("Dashboardy.", "Dashboards."),
                text: t(
                  "Rozwija się do 12 dziedzin. Nazwa dziedziny to link do jej przeglądu („Przegląd”); strzałka obok to przycisk z aria-expanded, który rozwija strony dziedziny. Dziedzina aktywnej strony jest rozwinięta i pogrubiona.",
                  "Expands to the 12 domains. A domain name is a link to its overview (“Przegląd”); the chevron next to it is a button with aria-expanded that expands the domain's pages. The domain of the active page is expanded and bold.",
                ),
              },
              {
                name: t("Przewodnik.", "Guide."),
                text: t(
                  "Rozwija się do Wprowadzenia i czterech grup: Podstawy, Układ i nawigacja, Wykresy i treści, Jakość i dane (tam też Metodologia i źródła).",
                  "Expands to the Introduction and four groups: Basics, Layout and navigation, Charts and content, Quality and data (Methodology and sources is there too).",
                ),
              },
              {
                name: t("Stopka, 48 px.", "Footer, 48px."),
                text: t(
                  "„zohelo bi · wersja 0.9”, na równi ze stopką treści (--foot-h). Wiersz logo i stopka stoją, przewija się środek. W menu nie ma nagłówków DZIEDZINY ani MOJE, plakietki danych przykładowych ani przełącznika PL | EN: język wybiera się w górnym pasku.",
                  "“zohelo bi · version 0.9”, level with the canvas footer (--foot-h). Brand row and footer stay; the middle scrolls. The sidebar has no DOMAINS or MINE headings, no sample-data badge and no PL | EN switch: the language is picked in the top bar.",
                ),
              },
            ]}
          />
        </div>
      </GSection>

      <GSection
        id="g-states"
        title={t("Stany elementu", "Item states")}
        lead={t(
          "Próbki są złożone tymi samymi klasami co prawdziwe menu (zt-nav-item); najechanie i fokus są tu wymuszone, żeby było je widać.",
          "The samples use the same classes as the real sidebar (zt-nav-item); hover and focus are forced here so they can be seen.",
        )}
      >
        <SpecTable
          caption={t("Stany elementu menu", "Sidebar item states")}
          head={[t("Stan", "State"), t("Wygląd", "Looks like"), t("Jak to zrobić", "How")]}
          rows={states.map((s) => [
            s.name,
            <div className="g-statecell" aria-hidden="true" key="s">
              {s.sample}
            </div>,
            s.how,
          ])}
        />
      </GSection>

      <GSection id="g-rail" title={t("Pasek ikon i menu wysuwane", "Icon rail and drawer")}>
        <Grid cols={2}>
          <Example
            ground="canvas"
            caption={t(
              "Poniżej 1280 px (albo na życzenie) menu zwija się do paska ikon 72 px (--rail-w). W wierszu logo 60 px stoją obok siebie znak i przycisk „Rozwiń menu”. Wyszukiwarka staje się przyciskiem, który otwiera pole w panelu obok paska. Każda ikona ma dymek i aria-label; aktywny element ma to samo tło i pasek co w wersji rozwiniętej.",
              "Below 1280px (or on request) the sidebar collapses to a 72px icon rail (--rail-w). The 60px brand row holds the mark and the “Rozwiń menu” (Expand menu) button side by side. Search becomes a button that opens the field in a panel beside the rail. Each icon has a tooltip and an aria-label; the active item keeps the fill and bar of the expanded state.",
            )}
          >
            <div className="g-railmock" style={{ gridTemplateColumns: "var(--rail-w) minmax(0, 1fr)" }} aria-hidden="true">
              <div className="g-railmock__rail">
                <span style={{ display: "flex", alignItems: "center", gap: 2, color: "var(--ink-3)" }}>
                  <Mark size={20} />
                  <Icon name="expand" size={16} />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="search" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="home" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="explore" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="catalog" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="dashboards" />
                </span>
                <span className="g-railmock__icon g-railmock__icon--on">
                  <Icon name="economy" />
                  <span className="g-railmock__tip">{t("Gospodarka", "Economy")}</span>
                </span>
                <span className="g-railmock__icon">
                  <Icon name="guide" />
                </span>
              </div>
              <div className="g-railmock__page">
                <span />
                <span />
                <span />
              </div>
            </div>
          </Example>
          <Example
            ground="canvas"
            caption={t(
              "Poniżej 768 px menu jest ukryte; przycisk „Otwórz menu” wysuwa panel 308 px nad tłem scrim, z tą samą treścią co menu rozwinięte. Esc i dotknięcie tła zamykają go, fokus wraca na przycisk. Cele dotykowe 44 px.",
              "Below 768px the sidebar is hidden; the “Otwórz menu” (Open menu) button slides in a 308px drawer over a scrim, with the same content as the expanded sidebar. Esc and a tap on the scrim close it, focus returns to the button. 44px touch targets.",
            )}
          >
            <div className="g-drawermock" aria-hidden="true">
              <div className="g-drawermock__panel">
                <div className="g-drawermock__head">
                  <span className="t-brand">
                    <Mark size={18} />
                    <span className="t-brand__word">zohelo</span> <span className="t-brand__product">bi</span>
                  </span>
                  <Icon name="close" />
                </div>
                <NavSample icon="home" label={t("Strona główna", "Home")} />
                <NavSample icon="dashboards" label={t("Dashboardy", "Dashboards")} />
                <NavSample icon="economy" label={t("Gospodarka", "Economy")} bold />
                <div className="zt-nav-sub">
                  <NavSample label={t("Ceny i inflacja", "Prices and inflation")} current />
                </div>
                <NavSample icon="finance" label={t("Finanse", "Finance")} />
              </div>
              <div className="g-drawermock__scrim" />
            </div>
          </Example>
        </Grid>
      </GSection>

      <GSection id="g-menu-rules" title={t("Reguły", "Rules")}>
        <Rules
          items={[
            t(
              "Szerokość 256 px rozwinięte, 72 px zwinięte (--rail-w), 308 px panel na telefonie; wybór użytkownika zapamiętany w przeglądarce.",
              "256px expanded, 72px collapsed (--rail-w), 308px drawer on phone; the user's choice is remembered in the browser.",
            ),
            t(
              "Kolejność stała: Strona główna, Eksplorator danych, Katalog danych, Dashboardy, Przewodnik. Metodologia nie ma osobnej pozycji: jest w Przewodniku i w stopce.",
              "Fixed order: Home, Data explorer, Data catalogue, Dashboards, Guide. Methodology has no item of its own: it is in the Guide and in the footer.",
            ),
            t(
              "Najwyżej 2 poziomy pod Dashboardy: dziedzina → strona. Trzeci poziom (sekcje strony) to przyciski w przyklejonym nagłówku pulpitu, nie pozycje menu.",
              "At most 2 levels under Dashboards: domain → page. The third level (page sections) is the buttons in the dashboard's sticky header, not sidebar items.",
            ),
            t(
              "Element 36 px (44 px na telefonie), ikona 18 px. Długie nazwy stron w drugim poziomie zawijają się z równymi odstępami; w wersji rozwiniętej etykiet nie ucinamy.",
              "Item 36px (44px on phone), icon 18px. Long page names on the second level wrap with even spacing; labels are never truncated when expanded.",
            ),
            <>
              {t("Całe menu to landmark", "The whole sidebar is the")} <Tok>nav</Tok>{" "}
              {t("„Główna” (wyszukiwarka w środku jako", "landmark “Główna” (search inside as")} <Tok>role=&quot;search&quot;</Tok>).{" "}
              {t("Nie", "Not")} <Tok>aside</Tok>
              {t(": VoiceOver ogłasza go jako region uzupełniający.", ": VoiceOver announces that as a complementary region.")}
            </>,
            t(
              "Pierwszy element strony to link „Przejdź do treści”; Tab przechodzi przez menu w kolejności wizualnej (nazwa dziedziny, potem jej strzałka).",
              "The first focusable element is the “Przejdź do treści” (Skip to content) link; Tab moves through the menu in visual order (domain name, then its chevron).",
            ),
            <>
              {t(
                "Ścieżka w górnym pasku powtarza położenie w menu. Zobacz też",
                "The top-bar breadcrumb repeats the position in the menu. See also",
              )}{" "}
              <Link to="/przewodnik/dostepnosc">{t("Dostępność", "Accessibility")}</Link>.
            </>,
          ]}
        />
        <DoDont
          ok={t("Same miejsca do odwiedzenia: strony, dziedziny, przewodnik.", "Only places to go: pages, domains, the guide.")}
          bad={t(
            "Akcje (Pobierz, Udostępnij), przełącznik języka albo plakietka danych przykładowych w menu.",
            "Actions (Download, Share), the language switch or the sample-data badge in the sidebar.",
          )}
          okNote={t("Aktywny element: tło, pasek i aria-current.", "Active item: fill, bar and aria-current.")}
          badNote={t(
            "Akcje strony stoją w nagłówku strony, język i konto w górnym pasku, dane przykładowe w stopce.",
            "Page actions sit in the page header, language and account in the top bar, sample data in the footer.",
          )}
        />
      </GSection>
    </>
  );
}
