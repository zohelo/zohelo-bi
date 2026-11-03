// Pulpit: reading order, grid spans, KPI tile rules with a live tile, chart card anatomy with a live
// ChartCard, filters, and the four chart states rendered with ChartState.

import { useState } from "react";
import { Link } from "../../router";
import { usePage } from "../context";
import { KpiTile, Segmented } from "../ui/blocks";
import { fmtChange } from "../format";
import { Anatomy, DoDont, Example, GSection, Grid, Rules, Tok, useT } from "./parts";
import { LiveHicpCard, StatesDemo } from "./live";

/** A sample tile with the values used throughout the template documentation. */
export function SampleKpi() {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  return (
    <KpiTile
      label={pl ? "Inflacja HICP, r/r" : "HICP inflation, y/y"}
      period={pl ? "wrz 2026" : "Sep 2026"}
      value={pl ? "2,9%" : "2.9%"}
      change={fmtChange(2.9, 3.0, "pct", "m/m", catalog, lang)}
      context={pl ? "W paśmie celu NBP (1,5–3,5%)" : "Within the NBP target band (1.5–3.5%)"}
      source={pl ? "Eurostat · miesięcznie" : "Eurostat · monthly"}
      spark={[3.8, 3.4, 3.1, 2.7, 2.6, 2.9, 3.2, 3.3, 3.0, 2.8, 3.0, 2.9]}
    />
  );
}

export function DashboardPage() {
  const { t } = useT();
  const [period, setPeriod] = useState<"1" | "5" | "10" | "max">("10");
  return (
    <>
      <GSection
        id="g-order"
        title={t("Kolejność czytania", "Reading order")}
        lead={t("Najpierw podsumowanie, potem szczegóły. Nigdy nie zaczynamy od tabeli ani panelu filtrów.", "Summary before detail. Never open with a table or a filter panel.")}
      >
        <div className="g-split">
          <div className="g-dash" aria-hidden="true">
            <div className="g-dash__head">
              <span className="g-n">1</span> {t("Nagłówek i wniosek", "Header and finding")}
            </div>
            <div className="g-dash__row g-dash__row--kpi">
              <span>
                <span className="g-n">2</span> KPI
              </span>
              <span>KPI</span>
              <span>KPI</span>
              <span>KPI</span>
            </div>
            <div className="g-dash__row g-dash__row--84">
              <span>
                <span className="g-n">3</span> {t("Główny trend · 8", "Main trend · 8")}
              </span>
              <span>
                <span className="g-n">4</span> {t("Uzupełnienie · 4", "Companion · 4")}
              </span>
            </div>
            <div className="g-dash__row g-dash__row--66">
              <span>
                <span className="g-n">5</span> {t("Geografia · 6", "Geography · 6")}
              </span>
              <span>{t("Struktura · 6", "Structure · 6")}</span>
            </div>
            <div className="g-dash__row g-dash__row--12">
              <span>
                <span className="g-n">6</span> {t("Tabela wszystkich serii · 12", "Table of all series · 12")}
              </span>
            </div>
          </div>
          <Anatomy
            items={[
              { name: t("Nagłówek strony:", "Page header:"), text: t("tytuł i jedno zdanie wniosku („Inflacja w Polsce wróciła do pasma celu NBP po szczycie z lutego 2023”).", "title and a one-sentence finding (“Inflation in Poland is back in the NBP target band after the February 2023 peak”).") },
              { name: t("Wiersz KPI:", "KPI row:"), text: t("3–5 kafelków, liczby do zapamiętania.", "3–5 tiles, the numbers to remember.") },
              { name: t("Główny trend:", "Main trend:"), text: t("najszersza karta (8 z 12 kolumn): główny wskaźnik w czasie z pasmem i adnotacją szczytu.", "the widest card (8 of 12 columns): the headline indicator over time with its band and peak annotation.") },
              { name: t("Uzupełnienie:", "Companion:"), text: t("4 kolumny: porównanie tego samego momentu (wykres pociskowy, ranking).", "4 columns: a comparison of the same moment (bullet chart, ranking).") },
              { name: t("Wiersze rozbicia:", "Breakdown rows:"), text: t("dwie karty po 6 kolumn: geografia, struktura, sezonowość.", "two 6-column cards: geography, structure, seasonality.") },
              { name: t("Szczegóły:", "Detail:"), text: t("tabela wszystkich serii ze strony, potem notka metodologiczna.", "a table of all series on the page, then the methodology note.") },
            ]}
          />
        </div>
      </GSection>

      <GSection
        id="g-grid"
        title={t("Siatka", "Grid")}
        lead={t(
          "12 kolumn, odstęp 16 px. Dozwolone podziały: 12, 8+4, 6+6, 4+4+4 i 3×4 (tylko KPI). Karty w wierszu mają wspólną wysokość wyznaczoną przez treść. Poniżej 1280 px każdy wiersz wykresów składa się do jednej kolumny w tej samej kolejności.",
          "12 columns, 16px gap. Allowed spans: 12, 8+4, 6+6, 4+4+4 and 3×4 (KPI only). Cards in a row share their height, set by content. Below 1280px every chart row stacks to one column in the same order.",
        )}
      >
        <div className="g-spans" aria-label={t("Dozwolone podziały siatki", "Allowed grid spans")} role="list">
          {[[12], [8, 4], [6, 6], [4, 4, 4], [3, 3, 3, 3]].map((row, i) => (
            <div key={i} className="t-grid g-spans__row" role="listitem">
              {row.map((n, j) => (
                <span key={j} className={`g-spans__cell t-span-${n}`}>
                  {n}
                  {n === 3 ? " (KPI)" : ""}
                </span>
              ))}
            </div>
          ))}
        </div>
        <Rules
          items={[
            t("Najwyżej 4 kafelki KPI i 6 kart wykresów nad tabelą szczegółów. Więcej trafia na inną zakładkę.", "At most 4 KPI tiles and 6 chart cards above the detail table. More belongs on another tab."),
            t("Jeden kolor bohatera na stronę: Polska to zawsze series-1; kraje porównawcze series-context, chyba że wykres porównuje 2–3 nazwane serie.", "One hero colour per page: Poland is always series-1; comparison countries series-context unless the chart compares 2–3 named series."),
          ]}
        />
      </GSection>

      <GSection id="g-kpi" title={t("Kafelek KPI", "KPI tile")}>
        <Grid cols={2}>
          <Example
            caption={t(
              "Prawdziwy komponent KpiTile. Strzałka i skróty są ukryte przed czytnikiem ekranu, który słyszy „spadek o 0,1 punktu procentowego w porównaniu z poprzednim miesiącem”.",
              "The real KpiTile component. The arrow and abbreviations are hidden from screen readers, which hear “down 0.1 percentage points compared with the previous month”.",
            )}
          >
            <div className="g-kpiwrap">
              <SampleKpi />
            </div>
          </Example>
          <Rules
            items={[
              <>
                {t("Wartość w", "Value in")} <Tok>kpi-value</Tok> {t("(cyfry proporcjonalne), okres w prawym górnym rogu w", "(proportional figures), period top-right in")} <Tok>ink-muted</Tok>.
              </>,
              <>
                {t("Zmiana: ▲/▼ + wartość + podstawa („▼ 0,1 pp m/m”) w", "Change: ▲/▼ + value + basis (“▼ 0.1 pp m/m”) in")} <Tok>ink-2</Tok>
                {t("; nigdy zielona ani czerwona.", "; never green or red.")}
              </>,
              t("Linia kontekstu nadaje liczbie znaczenie („W paśmie celu NBP”, „UE-27: 5,9%”).", "A context line gives the number meaning (“Within the NBP target band”, “EU-27: 5.9%”)."),
              t("Linia trendu 88×30 w series-1, bez osi, dekoracyjna; ukryta na telefonie.", "Sparkline 88×30 in series-1, no axes, decorative; hidden on phone."),
              t("4 w rzędzie na desktopie, 2 poniżej 1280 px.", "4 per row on desktop, 2 below 1280px."),
            ]}
          />
        </Grid>
        <DoDont
          ok={t("Liczba, okres, neutralna zmiana ze strzałką, kontekst, źródło.", "Number, period, neutral change with an arrow, context, source.")}
          bad={t("Wskaźnik zegarowy, pojedynczy słupek, pierścień postępu albo zmiana pokolorowana na zielono lub czerwono.", "A gauge, a single bar, a progress ring, or a change coloured green or red.")}
          badNote={t("Kafelek to nie wykres w przebraniu.", "A tile is not a chart in disguise.")}
        />
      </GSection>

      <GSection
        id="g-card"
        title={t("Karta wykresu", "Chart card")}
        lead={t(
          "Każdy wykres siedzi w karcie wykresu. Poniżej działający egzemplarz: przełącz na Tabelę, otwórz menu ⋯ (strzałki przesuwają, Esc zamyka).",
          "Every chart sits in a chart card. Below is a working one: switch to Table, open the ⋯ menu (arrows move, Esc closes).",
        )}
      >
        <div className="g-cardexample">
          <LiveHicpCard />
        </div>
        <Anatomy
          items={[
            { name: t("Tytuł", "Title"), text: t("(card-title) mówi wniosek, nie nazwę wykresu.", "(card-title) states the finding, not the chart's name.") },
            { name: t("Podtytuł", "Subtitle"), text: t("(caption, ink-3): miara, jednostka, częstotliwość, zakres.", "(caption, ink-3): measure, unit, frequency, range.") },
            { name: t("Wykres | Tabela", "Chart | Table"), text: t("w prawym górnym rogu, z aria-pressed; tabela ma ten sam tytuł, jednostki i źródło.", "top-right, with aria-pressed; the table has the same title, units and source.") },
            {
              name: t("Menu ⋯", "⋯ menu"),
              text: t(
                "w stałej kolejności: Pokaż tabelę, Pełny ekran · Pobierz CSV, Pobierz PNG, Kopiuj link, Osadź · Otwórz w Eksploratorze, Źródło i metodologia.",
                "in a fixed order: Show table, Full screen · Download CSV, Download PNG, Copy link, Embed · Open in Explorer, Source and methodology.",
              ),
            },
            { name: t("Wykres", "Chart"), text: t("z biblioteki wykresów, role=\"img\" z jednozdaniowym opisem.", "from the chart library, role=\"img\" with a one-sentence description.") },
            { name: t("Legenda", "Legend"), text: t("pod wykresem dla 2+ serii.", "under the chart for 2+ series.") },
            { name: t("Linia źródła", "Source line"), text: t("na dole: źródło, data danych, następna publikacja.", "at the bottom: source, data date, next release.") },
          ]}
        />
      </GSection>

      <GSection id="g-filters" title={t("Filtry", "Filters")}>
        <Grid cols={2}>
          <Rules
            items={[
              t("Filtry całego pulpitu w jednym wierszu pod nagłówkiem (Okres, Obszar, Częstotliwość, Źródło); każdy to przycisk z bieżącą wartością.", "Dashboard-wide filters in one row under the header (Period, Area, Frequency, Source); each is a button showing its current value."),
              t("Działają na każdą kartę i są zapisane w adresie URL. Karta, której filtr nie dotyczy, mówi to w podtytule.", "They apply to every card and are written to the URL. A card a filter does not apply to says so in its subtitle."),
              t("Serie porównawcze to usuwalne chipy z próbką koloru serii.", "Comparison series are removable chips with their series colour swatch."),
              <>
                {t("Okres to przełącznik segmentowy z", "The period is a segmented control with")} <Tok>aria-pressed</Tok>. {t("Więcej w", "More in")} <Link to="/przewodnik/komponenty#g-filterbar">{t("Komponentach", "Components")}</Link>.
              </>,
            ]}
          />
          <Example caption={t("Przełącznik okresu: opcje to rzeczowniki czasu.", "Period control: options are nouns of time.")}>
            <Segmented
              label={t("Okres pulpitu", "Dashboard period")}
              value={period}
              onChange={setPeriod}
              options={[
                { value: "1", label: t("1 rok", "1 year") },
                { value: "5", label: t("5 lat", "5 years") },
                { value: "10", label: t("10 lat", "10 years") },
                { value: "max", label: "Max" },
              ]}
            />
          </Example>
        </Grid>
      </GSection>

      <GSection
        id="g-cardstates"
        title={t("Stany karty", "Card states")}
        lead={t(
          "Ta sama wysokość co wykres (min. 170 px), żeby układ nie skakał. Pusty i nieobowiązujący stan mówią, co zrobić dalej; błąd mówi, co się nie udało, i daje Spróbuj ponownie.",
          "Same height as the chart (min 170px) so the layout doesn't jump. Empty and not-applicable say what to do next; error says what failed and offers Try again.",
        )}
      >
        <StatesDemo />
      </GSection>
    </>
  );
}
