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
              <span className="g-shell__cap">DZIEDZINY</span>
              <span className="g-shell__nav" />
              <span className="g-shell__nav" />
              <span className="g-shell__nav" />
              <span className="g-shell__size">256</span>
            </div>
            <div className="g-shell__main">
              <div className="g-shell__top">
                {t("Ścieżka · akcje strony", "Breadcrumb · page actions")}
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
                <span className="g-shell__size g-shell__size--content">max 1184 · 12 {t("kolumn", "columns")}</span>
              </div>
              <div className="g-shell__foot">{t("Stopka: źródła · metodologia · wersja danych", "Footer: sources · methodology · data version")}</div>
            </div>
          </div>
          <Anatomy
            items={[
              {
                name: t("Menu boczne", "Sidebar"),
                text: t(
                  "256 px, surface, prawa krawędź line: logo i przycisk zwijania, wyszukiwarka z Ctrl K, menu główne, DZIEDZINY, MOJE, na dole Metodologia, plakietka danych przykładowych i PL | EN.",
                  "256px, surface, line right border: lockup and collapse button, search with Ctrl K, primary nav, DOMAINS, MINE, then Methodology, the sample-data badge and PL | EN.",
                ),
              },
              {
                name: t("Górny pasek", "Top bar"),
                text: t(
                  "60 px: ścieżka powtarzająca położenie w menu i akcje strony z prawej (Udostępnij, Pobierz dane). Na telefonie przycisk menu i jedna akcja.",
                  "60px: breadcrumb repeating the sidebar position and page actions on the right (Share, Download data). On phone the menu button and one action.",
                ),
              },
              {
                name: t("Nagłówek strony", "Page header"),
                text: t(
                  "h1 w page-title, jedno zdanie wniosku w body-l ink-2, przełącznik okresu z prawej.",
                  "h1 in page-title, one-sentence finding in body-l ink-2, period control on the right.",
                ),
              },
              {
                name: t("Zakładki strony", "Page tabs"),
                text: t("Opcjonalne, najwyżej 5, każda to osobny adres (linki z aria-current).", "Optional, at most 5, each its own URL (links with aria-current)."),
              },
              {
                name: t("Treść", "Content"),
                text: t("12 kolumn, odstęp 16 px, maks. 1184 px, margines 32 px (16 px na telefonie).", "12 columns, 16px gap, max 1184px, 32px gutter (16px on phone)."),
              },
              {
                name: t("Stopka", "Footer"),
                text: t(
                  "Jedna linia: źródła danych, metodologia, wersja danych, kontakt.",
                  "One line: data sources, methodology, data version, contact.",
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
              <span className="g-site__links">bi · data · {t("O projekcie", "About")} · {t("Metodologia", "Methodology")}</span>
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
            ["≥ 1280 px", t("rozwinięte 256 px", "expanded 256px"), t("KPI 4 w rzędzie, wiersze wykresów 2:1 lub 1:1", "KPI 4 per row, chart rows 2:1 or 1:1")],
            ["1024–1279 px", t("pasek ikon 64 px z dymkami", "64px icon rail with tooltips"), t("KPI 2 w rzędzie, wykresy w jednej kolumnie", "KPI 2 per row, charts stack to one column")],
            ["768–1023 px", t("pasek ikon", "icon rail"), t("jak wyżej", "as above")],
            [
              "< 768 px",
              t("ukryte; przycisk menu otwiera panel 308 px nad tłem scrim", "hidden; the menu button opens a 308px drawer over a scrim"),
              t(
                "jedna kolumna, KPI 2 w rzędzie bez linii trendu, kontrolki 44 px, wykresy w wersji na telefon",
                "one column, KPI 2 per row without sparklines, 44px controls, phone chart variants",
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
            [t("Pulpit", "Dashboard"), t("Przegląd dziedziny lub tematu (Ceny i inflacja)", "A domain or topic overview (Prices and inflation)"), t("Nagłówek, zakładki, KPI, wiersze wykresów, notka", "Header, tabs, KPI row, chart rows, footer note")],
            [
              t("Wskaźnik", "Indicator"),
              t("Jeden wskaźnik (Inflacja HICP)", "One indicator (HICP inflation)"),
              t(
                "Ścieżka, duża liczba z okresem i zmianą, główny wykres z pasmem, ranking, inne źródła, metodologia, cytowanie, powiązane",
                "Breadcrumb, hero number with period and change, main chart with band, ranking, other sources, methodology, citation, related",
              ),
            ],
            [t("Eksplorator", "Explorer"), t("Swobodne porównania", "Free comparison"), t("Panel zapytania z lewej, wykres + tabela, akcje", "Left query panel, chart + table, actions")],
            [
              t("Katalog", "Catalogue"),
              t("Szukanie wskaźników", "Finding indicators"),
              t("Wyszukiwarka, chipy filtrów, gęste wiersze z linią trendu, ostatnią wartością, zasięgiem, źródłami", "Search, filter chips, dense rows with sparkline, latest value, coverage, sources"),
            ],
            [
              t("Zbiór danych (data)", "Dataset (data)"),
              t("Jeden zbiór", "One dataset"),
              t("Tytuł, opis, świeżość, zasięg, formaty pobrania, przykład API, zmienne, licencja", "Title, description, freshness, coverage, download formats, API snippet, variables, licence"),
            ],
            [t("Artykuł / strona startowa", "Article / landing"), t("Strony zohelo.com", "zohelo.com pages"), t("Powłoka serwisu, teza + KPI, sekcje kart", "Site shell, hero claim + KPI tiles, sections of cards")],
            [t("Dokumentacja", "Documentation"), t("Metodologia, API, ten przewodnik", "Methodology, API, this guide"), t("Powłoka aplikacji, spis treści z lewej, tekst maks. 72 znaki", "App shell, table of contents on the left, prose max 72ch")],
            [t("Strony systemowe", "System pages"), "404, " + t("błąd, przerwa", "error, maintenance"), t("Powłoka zostaje; prosty komunikat, co dalej, link do wyszukiwania", "Shell kept; plain message, what to do next, link to search")],
          ]}
        />
      </GSection>

      <GSection id="g-fresh" title={t("Informacja, świeżość i odświeżanie", "Info, freshness and refresh")}>
        <Grid cols={2}>
          <Rules
            items={[
              t("Każda strona podaje w stopce, kiedy wczytano dane („Dane z 24 paź 2026”).", "Every page shows when its data was loaded in the footer note (“Data from 24 Oct 2026”)."),
              t("Każda karta wykresu podaje źródło i, gdzie to ma sens, następną publikację.", "Every chart card shows its source and, where relevant, the next release."),
              t("Etykiety statusu opisują dane, nigdy ich wartość.", "Status tags describe the data, never its value."),
              t(
                "Czytelnik nie ma przycisku „Odśwież”: dane zmieniają się z publikacją. Narzędzie na żywych danych pokazuje Odśwież jako przycisk drugorzędny z czasem ostatniego uruchomienia.",
                "Readers have no “refresh” button: data updates on publication. A tool on live data shows Refresh as a secondary button with the last-run time.",
              ),
              t("Plakietka „Dane przykładowe” jest obowiązkowa, dopóki jakakolwiek wartość na stronie jest syntetyczna.", "The “Sample data” badge is mandatory while any value on the page is synthetic."),
            ]}
          />
          <Example ground="surface" caption={t("Etykieta statusu zawsze ma słowo i kropkę, obok jedną linię szczegółów.", "A status tag always carries a word and the dot, with one line of detail next to it.")}>
            <div className="g-stack">
              <p className="g-tagline">
                <StatusTag kind="current">{t("Aktualne", "Current")}</StatusTag>
                <span>{t("Ostatni odczyt wrz 2026, pobrany 24 paź 2026. Następny: 17 lis 2026.", "Last reading Sep 2026, loaded 24 Oct 2026. Next: 17 Nov 2026.")}</span>
              </p>
              <p className="g-tagline">
                <StatusTag kind="preliminary">{t("Wstępne", "Preliminary")}</StatusTag>
                <span>{t("Szybki szacunek; może się zmienić przy pełnej publikacji.", "Flash estimate; may change with the full release.")}</span>
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
