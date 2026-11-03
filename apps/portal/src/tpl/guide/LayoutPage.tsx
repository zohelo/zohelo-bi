// Układ strony: app shell vs site shell, regions with sizes, responsive behaviour, page types, info and freshness.

import { StatusTag } from "../ui/blocks";
import { Mark } from "../ui/icons";
import { Anatomy, Example, GSection, Grid, Rules, SpecTable, Tok, useT } from "./parts";

export function LayoutPage() {
  const { t } = useT();
  return (
    <>
      <GSection
        id="g-appshell"
        title={t("Powłoka aplikacji", "App shell")}
        lead={t(
          "bi.zohelo.com, data.zohelo.com i narzędzia: menu boczne, górny pasek i treść. Każda sekcja zaczyna się od tego samego szkieletu.",
          "bi.zohelo.com, data.zohelo.com and tools: sidebar, top bar and content. Every section starts from the same skeleton.",
        )}
      >
        <div className="g-split">
          <div className="g-shell" aria-hidden="true">
            <div className="g-shell__side">
              <span className="g-shell__brand">
                <Mark size={14} /> zohelo <em>bi</em>
              </span>
              <span className="g-shell__search" />
              <span className="g-shell__nav g-shell__nav--on" />
              <span className="g-shell__nav" />
              <span className="g-shell__nav" />
              <span className="g-shell__nav" />
              <span className="g-shell__nav" />
              <span className="g-shell__cap" style={{ marginTop: "auto" }}>
                {t("wersja 0.9", "version 0.9")}
              </span>
              <span className="g-shell__size">256</span>
            </div>
            <div className="g-shell__main">
              <div className="g-shell__top">
                {t("Ścieżka · data danych · język · konto", "Breadcrumb · data date · language · account")}
                <span className="g-shell__size">60</span>
              </div>
              <div className="g-shell__content">
                <div className="g-shell__head">
                  <span className="g-shell__h1" />
                  <span className="g-shell__seg" />
                </div>
                <div className="g-shell__row g-shell__row--kpi">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="g-shell__row g-shell__row--84">
                  <span>8</span>
                  <span>4</span>
                </div>
                <div className="g-shell__row g-shell__row--66">
                  <span>6</span>
                  <span>6</span>
                </div>
                <span className="g-shell__size g-shell__size--content">
                  {t("pełna szerokość", "full width")} · 12 {t("kolumn", "columns")}
                </span>
              </div>
              <div className="g-shell__foot">
                {t("Stopka 48: dane przykładowe · źródła · Metodologia", "Footer 48: sample data · sources · Methodology")}
              </div>
            </div>
          </div>
          <Anatomy
            items={[
              {
                name: t("Menu boczne", "Sidebar"),
                text: t(
                  "256 px, surface, prawa krawędź line: wiersz logo 60 px z przyciskiem zwijania, wyszukiwarka (Ctrl K), potem Strona główna, Eksplorator danych, Katalog danych, Dashboardy (12 dziedzin) i Przewodnik. Na dole wiersz 48 px „zohelo bi · wersja 0.9”, na równi ze stopką treści.",
                  "256px, surface, line right border: 60px brand row with the collapse button, search (Ctrl K), then Home, Data explorer, Data catalogue, Dashboards (12 domains) and Guide. At the bottom a 48px row “zohelo bi · version 0.9”, level with the canvas footer.",
                ),
              },
              {
                name: t("Górny pasek", "Top bar"),
                text: t(
                  "60 px: ścieżka z lewej; z prawej data danych i wersja („Dane z 24.10.2026 · wersja 0.9”), menu języka (flaga i kod) i przycisk „Zaloguj się”. Bez Udostępnij, Kopiuj link i Pobierz. Na telefonie przycisk menu, język i konto.",
                  "60px: breadcrumb on the left; on the right the data date and version (“Dane z 24.10.2026 · wersja 0.9”), the language menu (flag and code) and the “Zaloguj się” (Sign in) button. No Share, Copy link or Download. On phone the menu button, language and account.",
                ),
              },
              {
                name: t("Nagłówek strony", "Page header"),
                text: t(
                  "h1 w page-title, jedno zdanie wniosku w body-l ink-2, z prawej akcje strony: „Pobierz dane” jako przycisk główny. Na pulpicie nagłówek jest przyklejony: tytuł, Pobierz dane i przyciski sekcji.",
                  "h1 in page-title, one-sentence finding in body-l ink-2, page actions on the right: “Pobierz dane” (Download data) as the primary button. On a dashboard the header is sticky: title, Download data and the section buttons.",
                ),
              },
              {
                name: t("Treść", "Content"),
                text: t(
                  "Pełna szerokość okna (bez limitu 1184 px), 12 kolumn, odstęp 16 px, margines 28 px (16 px na telefonie); odstęp od przyklejonego nagłówka.",
                  "The full window width (no 1184px limit), 12 columns, 16px gap, 28px gutter (16px on phone); padding keeps it off the sticky header.",
                ),
              },
              {
                name: t("Stopka", "Footer"),
                text: t(
                  "48 px (--foot-h), przyklejona do dołu okna: jedna informacja „Dane przykładowe: wszystkie wartości są syntetyczne”, źródła i link Metodologia. Pas 10 px w kolorze canvas nad nią odsuwa przewijaną treść od jej krawędzi.",
                  "48px (--foot-h), stuck to the bottom of the window: the one notice “Dane przykładowe: wszystkie wartości są syntetyczne” (sample data), the sources and a Methodology link. A 10px canvas strip above it keeps scrolling content off its edge.",
                ),
              },
            ]}
          />
        </div>
      </GSection>

      <GSection
        id="g-siteshell"
        title={t("Powłoka serwisu", "Site shell")}
        lead={t(
          "zohelo.com: górna nawigacja bez menu bocznego, te same tokeny, nagłówek i komponenty.",
          "zohelo.com: top navigation without a sidebar, the same tokens, header and components.",
        )}
      >
        <div className="g-split">
          <div className="g-site" aria-hidden="true">
            <div className="g-site__top">
              <span className="g-shell__brand">
                <Mark size={14} /> zohelo
              </span>
              <span className="g-site__links">
                bi · data · {t("O projekcie", "About")} · {t("Metodologia", "Methodology")}
              </span>
              <span className="g-site__btn">{t("Otwórz pulpity", "Open dashboards")}</span>
              <span className="g-shell__size">64</span>
            </div>
            <div className="g-site__hero">
              <span className="g-shell__h1" />
              <div className="g-shell__row g-shell__row--3">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="g-site__foot">
              <span>{t("Produkty", "Products")}</span>
              <span>{t("Dane i metodologia", "Data and methodology")}</span>
              <span>{t("Projekt", "Project")}</span>
            </div>
          </div>
          <Rules
            items={[
              t(
                "Nagłówek 64 px: logo, nawigacja (bi, data, O projekcie, Metodologia), przełącznik języka i jeden przycisk główny „Otwórz pulpity”.",
                "64px header: lockup, nav (bi, data, About, Methodology), language switch and one primary button “Open dashboards”.",
              ),
              t("Treść maks. site-max 1280 px.", "Content max site-max 1280px."),
              t(
                "Pełna stopka na surface-inverse: logo odwrócone, trzy kolumny linków, źródła i licencja.",
                "Full footer on surface-inverse: reversed lockup, three link columns, source attribution and licence.",
              ),
              t(
                "Otwarte: czy strona startowa data.zohelo.com użyje powłoki serwisu, czy od razu katalogu w powłoce aplikacji. Strony zbiorów danych używają powłoki aplikacji.",
                "Open: whether data.zohelo.com's landing uses the site shell or opens straight into the catalogue in the app shell. Dataset pages use the app shell.",
              ),
            ]}
          />
        </div>
      </GSection>

      <GSection
        id="g-responsive"
        title={t("Zachowanie na różnych szerokościach", "Responsive behaviour")}
        lead={t(
          "Strona nigdy nie przewija się w bok. Szerokie tabele przewijają się we własnym kontenerze. Zmień szerokość okna, żeby zobaczyć to na tej stronie.",
          "The page never scrolls sideways. Wide tables scroll inside their own container. Resize the window to see it on this page.",
        )}
      >
        <SpecTable
          caption={t("Zachowanie na różnych szerokościach", "Responsive behaviour")}
          head={[t("Szerokość", "Width"), t("Menu boczne", "Sidebar"), t("Treść", "Content")]}
          rows={[
            [
              "≥ 1280 px",
              t("rozwinięte 256 px", "expanded 256px"),
              t("KPI 4 w rzędzie, wiersze wykresów 2:1 lub 1:1", "KPI 4 per row, chart rows 2:1 or 1:1"),
            ],
            [
              "1024–1279 px",
              t("pasek ikon 72 px z dymkami", "72px icon rail with tooltips"),
              t("KPI 2 w rzędzie, wykresy w jednej kolumnie", "KPI 2 per row, charts stack to one column"),
            ],
            ["768–1023 px", t("pasek ikon 72 px", "72px icon rail"), t("jak wyżej", "as above")],
            [
              "< 768 px",
              t("ukryte; przycisk menu otwiera panel 308 px nad tłem scrim", "hidden; the menu button opens a 308px drawer over a scrim"),
              t(
                "jedna kolumna, KPI 2 w rzędzie bez linii trendu, kontrolki 44 px, wykresy w wersji na telefon; sekcje pulpitu w naturalnej wysokości",
                "one column, KPI 2 per row without sparklines, 44px controls, phone chart variants; dashboard sections at their natural height",
              ),
            ],
          ]}
        />
      </GSection>

      <GSection id="g-pagetypes" title={t("Typy stron", "Page types")}>
        <SpecTable
          caption={t("Typy stron", "Page types")}
          head={[t("Typ", "Type"), t("Do czego", "Used for"), t("Szkielet", "Skeleton")]}
          rows={[
            [
              t("Strona główna", "Home"),
              t("Wejście do portalu (/)", "The portal's entry page (/)"),
              t("W przeprojektowaniu", "Being redesigned"),
            ],
            [
              t("Pulpit", "Dashboard"),
              t(
                "Przegląd dziedziny (Gospodarka) lub jedna jej strona (Ceny i inflacja)",
                "A domain overview (Economy) or one of its pages (Prices and inflation)",
              ),
              t(
                "Przyklejony nagłówek (tytuł, Pobierz dane, przyciski sekcji), wniosek i filtry, potem ekrany: KPI z pierwszą sekcją, dalej po jednej sekcji na ekran",
                "Sticky header (title, Download data, section buttons), lead and filters, then screens: KPI row with the first section, then one section per screen",
              ),
            ],
            [
              t("Wskaźnik", "Indicator"),
              t("Jeden wskaźnik (Inflacja HICP)", "One indicator (HICP inflation)"),
              t(
                "Ścieżka, duża liczba z okresem i zmianą, główny wykres z pasmem, ranking, inne źródła, metodologia, cytowanie, powiązane",
                "Breadcrumb, hero number with period and change, main chart with band, ranking, other sources, methodology, citation, related",
              ),
            ],
            [
              t("Eksplorator", "Explorer"),
              t("Swobodne porównania", "Free comparison"),
              t(
                "Pasek zapytania z przyciskami filtrów, wykres na całą szerokość, CSV",
                "Query bar of filter buttons, full-width chart, CSV",
              ),
            ],
            [
              t("Katalog", "Catalogue"),
              t("Szukanie wskaźników", "Finding indicators"),
              t(
                "Wyszukiwarka, chipy filtrów, gęste wiersze z linią trendu, ostatnią wartością, zasięgiem, źródłami",
                "Search, filter chips, dense rows with sparkline, latest value, coverage, sources",
              ),
            ],
            [
              t("Zbiór danych (data)", "Dataset (data)"),
              t("Jeden zbiór", "One dataset"),
              t(
                "Tytuł, opis, świeżość, zasięg, formaty pobrania, przykład API, zmienne, licencja",
                "Title, description, freshness, coverage, download formats, API snippet, variables, licence",
              ),
            ],
            [
              t("Artykuł / strona startowa", "Article / landing"),
              t("Strony zohelo.com", "zohelo.com pages"),
              t("Powłoka serwisu, teza + KPI, sekcje kart", "Site shell, hero claim + KPI tiles, sections of cards"),
            ],
            [
              t("Dokumentacja", "Documentation"),
              t("Metodologia, API, ten przewodnik", "Methodology, API, this guide"),
              t(
                "Powłoka aplikacji; strony przewodnika w menu bocznym pod Przewodnik (bez osobnego spisu treści), tekst maks. 72 znaki",
                "App shell; the guide pages in the sidebar under Guide (no separate table of contents), prose max 72ch",
              ),
            ],
            [
              t("Strony systemowe", "System pages"),
              "404, " + t("błąd, przerwa", "error, maintenance"),
              t(
                "Powłoka zostaje; prosty komunikat, co dalej, link do wyszukiwania",
                "Shell kept; plain message, what to do next, link to search",
              ),
            ],
          ]}
        />
      </GSection>

      <GSection id="g-fresh" title={t("Informacja, świeżość i odświeżanie", "Info, freshness and refresh")}>
        <Grid cols={2}>
          <Rules
            items={[
              t(
                "Każda strona podaje w górnym pasku datę danych i wersję portalu („Dane z 24.10.2026 · wersja 0.9”).",
                "Every page shows the data date and the portal version in the top bar (“Data as of 24.10.2026 · version 0.9”).",
              ),
              t(
                "Każda karta wykresu podaje źródło i, gdzie to ma sens, następną publikację.",
                "Every chart card shows its source and, where relevant, the next release.",
              ),
              t("Etykiety statusu opisują dane, nigdy ich wartość.", "Status tags describe the data, never its value."),
              t(
                "Czytelnik nie ma przycisku „Odśwież”: dane zmieniają się z publikacją. Narzędzie na żywych danych pokazuje Odśwież jako przycisk drugorzędny z czasem ostatniego uruchomienia.",
                "Readers have no “refresh” button: data updates on publication. A tool on live data shows Refresh as a secondary button with the last-run time.",
              ),
              t(
                "Informacja „Dane przykładowe: wszystkie wartości są syntetyczne” jest obowiązkowa, dopóki jakakolwiek wartość jest syntetyczna. Stoi raz, w stopce przyklejonej do dołu okna; nie powtarzamy jej w menu bocznym ani w nagłówku strony.",
                "The notice “Dane przykładowe: wszystkie wartości są syntetyczne” (sample data) is mandatory while any value is synthetic. It appears once, in the footer stuck to the bottom of the window; it is not repeated in the sidebar or the page header.",
              ),
            ]}
          />
          <Example
            ground="surface"
            caption={t(
              "Etykieta statusu zawsze ma słowo i kropkę, obok jedną linię szczegółów.",
              "A status tag always carries a word and the dot, with one line of detail next to it.",
            )}
          >
            <div className="g-stack">
              <p className="g-tagline">
                <StatusTag kind="current">{t("Aktualne", "Current")}</StatusTag>
                <span>
                  {t(
                    "Ostatni odczyt wrz 2026, pobrany 24 paź 2026. Następny: 17 lis 2026.",
                    "Last reading Sep 2026, loaded 24 Oct 2026. Next: 17 Nov 2026.",
                  )}
                </span>
              </p>
              <p className="g-tagline">
                <StatusTag kind="preliminary">{t("Wstępne", "Preliminary")}</StatusTag>
                <span>
                  {t("Szybki szacunek; może się zmienić przy pełnej publikacji.", "Flash estimate; may change with the full release.")}
                </span>
              </p>
              <p className="g-tagline">
                <StatusTag kind="revised">{t("Zrewidowane", "Revised")}</StatusTag>
                <span>{t("Wartość za sie 2026 zmieniona z 3,0% na 2,9%.", "Aug 2026 value changed from 3.0% to 2.9%.")}</span>
              </p>
              <p className="g-tagline">
                <StatusTag kind="sample">{t("Dane przykładowe", "Sample data")}</StatusTag>
                <span>
                  {t("Wszystkie wartości są syntetyczne.", "All values are synthetic.")} <Tok>sample-*</Tok>
                </span>
              </p>
            </div>
          </Example>
        </Grid>
      </GSection>
    </>
  );
}
