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
        "Dziedzina, w której jest aktywna strona: waga 600, rozwinięta (aria-expanded).",
        "The domain holding the active page: weight 600, expanded (aria-expanded).",
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
                  <span className="t-grow">{t("Szukaj wskaźnika", "Search indicators")}</span>
                  <kbd className="zt-kbd">Ctrl K</kbd>
                </div>
                <span className="g-n g-n--side">2</span>
              </div>
              <div className="g-sidemock__group">
                <NavSample icon="home" label={t("Przegląd", "Overview")} />
                <NavSample icon="explore" label={t("Eksplorator", "Explorer")} />
                <NavSample icon="catalog" label={t("Katalog wskaźników", "Indicator catalogue")} />
                <span className="g-n g-n--side">3</span>
              </div>
              <div className="g-sidemock__group">
                <p className="zt-nav-group">{t("Dziedziny", "Domains")}</p>
                <span className="g-n g-n--side">4</span>
                <NavSample icon="economy" label={t("Gospodarka", "Economy")} bold />
                <div className="zt-nav-sub">
                  <NavSample label={t("Ceny i inflacja", "Prices and inflation")} current />
                  <NavSample label={t("Rachunki narodowe", "National accounts")} />
                </div>
                <NavSample icon="finance" label={t("Finanse", "Finance")} />
                <div className="g-sidemock__group">
                  <NavSample icon="health" label={t("Wkrótce: 3 dziedziny", "Soon: 3 domains")} disabled />
                  <span className="g-n g-n--side">5</span>
                </div>
              </div>
              <div className="g-sidemock__group">
                <p className="zt-nav-group">{t("Moje", "Mine")}</p>
                <span className="g-n g-n--side">6</span>
                <NavSample icon="saved" label={t("Zapisane widoki", "Saved views")} />
              </div>
            </div>
            <div className="g-sidemock__foot">
              <NavSample icon="doc" label={t("Metodologia i źródła", "Methodology and sources")} />
              <span className="g-n g-n--side">7</span>
            </div>
          </div>
          <Anatomy
            items={[
              {
                name: t("Wiersz logo, 60 px.", "Brand row, 60px."),
                text: t(
                  "Logo na żywo + przycisk „Zwiń menu” (aria-expanded, aria-controls).",
                  "Live lockup + “Collapse menu” button (aria-expanded, aria-controls).",
                ),
              },
              {
                name: t("Wyszukiwarka.", "Search."),
                text: t(
                  'Ze skrótem Ctrl K; otwiera szybkie wyszukiwanie. W role="search".',
                  'With the Ctrl K hint; opens the command palette. Inside role="search".',
                ),
              },
              {
                name: t("Menu główne.", "Primary items."),
                text: t("Przegląd, Eksplorator, Katalog wskaźników.", "Overview, Explorer, Indicator catalogue."),
              },
              {
                name: t("DZIEDZINY.", "DOMAINS."),
                text: t(
                  "Tylko dziedziny z danymi; aktywna rozwinięta do swoich stron. Dziedzina to przycisk z aria-expanded, strona to link.",
                  "Only domains with data; the active one expanded to its pages. A domain is a button with aria-expanded, a page is a link.",
                ),
              },
              {
                name: t("Jeden wiersz „Wkrótce: N dziedzin”.", "One “Soon: N domains” row."),
                text: t(
                  "Zbiera puste dziedziny zamiast wymieniać je po kolei.",
                  "Collects empty domains instead of listing them one by one.",
                ),
              },
              { name: t("MOJE.", "MINE."), text: t("Zapisane widoki i Obserwowane, z liczbami.", "Saved views and Watched, with counts.") },
              {
                name: t("Stopka.", "Footer."),
                text: t(
                  "Metodologia i źródła, plakietka danych przykładowych, PL | EN. Wiersz logo i stopka stoją, przewija się środek.",
                  "Methodology and sources, sample-data badge, PL | EN. Brand row and footer stay; the middle scrolls.",
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
              "Poniżej 1280 px (albo na życzenie) menu zwija się do paska ikon 64 px. Każda ikona ma dymek po najechaniu i fokusie oraz aria-label; aktywny element ma to samo tło i pasek co w wersji rozwiniętej.",
              "Below 1280px (or on request) the sidebar collapses to a 64px icon rail. Each icon has a tooltip on hover and focus and an aria-label; the active item keeps the fill and bar of the expanded state.",
            )}
          >
            <div className="g-railmock" aria-hidden="true">
              <div className="g-railmock__rail">
                <Mark size={20} />
                <span className="g-railmock__icon">
                  <Icon name="search" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="home" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="explore" />
                </span>
                <span className="g-railmock__icon g-railmock__icon--on">
                  <Icon name="economy" />
                  <span className="g-railmock__tip">{t("Gospodarka · 4 pulpity", "Economy · 4 dashboards")}</span>
                </span>
                <span className="g-railmock__icon">
                  <Icon name="finance" />
                </span>
                <span className="g-railmock__icon">
                  <Icon name="labour" />
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
              "Poniżej 768 px menu jest ukryte; przycisk „Otwórz menu” wysuwa panel 308 px nad tłem scrim. Fokus zostaje w panelu, Esc i dotknięcie tła zamykają go, fokus wraca na przycisk. Cele dotykowe 44 px.",
              "Below 768px the sidebar is hidden; the “Open menu” button slides in a 308px drawer over a scrim. Focus stays inside, Esc and a tap on the scrim close it, focus returns to the button. 44px touch targets.",
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
                <NavSample icon="home" label={t("Przegląd", "Overview")} />
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
              "Szerokość 256 px rozwinięte, 64 px zwinięte, 308 px panel na telefonie; wybór użytkownika zapamiętany w przeglądarce.",
              "256px expanded, 64px collapsed, 308px drawer on phone; the user's choice is remembered in the browser.",
            ),
            t(
              "Najwyżej 2 poziomy: dziedzina → strona. Głębiej prowadzą zakładki strony.",
              "At most 2 levels: domain → page. Deeper navigation uses page tabs.",
            ),
            t(
              "Element 36 px (44 px na telefonie), ikona 18 px. W wersji rozwiniętej etykiet nie ucinamy: skracamy treść.",
              "Item 36px (44px on phone), icon 18px. Labels are never truncated when expanded: shorten the label instead.",
            ),
            <>
              {t("Całe menu to landmark", "The whole sidebar is the")} <Tok>nav</Tok>{" "}
              {t("„Główna” (wyszukiwarka w środku jako", "landmark “Główna” (search inside as")} <Tok>role=&quot;search&quot;</Tok>).{" "}
              {t("Nie", "Not")} <Tok>aside</Tok>
              {t(": VoiceOver ogłasza go jako region uzupełniający.", ": VoiceOver announces that as a complementary region.")}
            </>,
            t(
              "Pierwszy element strony to link „Przejdź do treści”; Tab przechodzi przez menu w kolejności wizualnej.",
              "The first focusable element is the “Skip to content” link; Tab moves through the menu in visual order.",
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
          ok={t("Jeden wiersz „Wkrótce: 3 dziedziny”.", "One row “Soon: 3 domains”.")}
          bad={t("Każda pusta dziedzina osobno, wyszarzona.", "Every empty domain listed separately, greyed out.")}
          okNote={t("Aktywny element: tło, pasek i aria-current.", "Active item: fill, bar and aria-current.")}
          badNote={t(
            "Aktywny element zaznaczony samym kolorem tekstu; akcje (Pobierz, Udostępnij) w menu.",
            "Active item marked by text colour alone; actions (Download, Share) in the sidebar.",
          )}
        />
      </GSection>
    </>
  );
}
