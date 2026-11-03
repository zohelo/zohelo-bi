// Biblioteka wykresów: every chart type grouped by job, drawn live by ZChart from CHART_SAMPLES, with
// when / avoid / colour rules; then colour by job, marks, interaction, phone and number formatting.
// While the library has no sample for a type, a clear placeholder stands in; nothing else changes.

import { CHART_SAMPLES, toTable, ZChart, type ChartSample } from "@zohelo/visuals";
import { Link } from "../../router";
import { ChartCard } from "../ui/blocks";
import { TableView } from "../ui/TableView";
import { chartAnchor, chartEntries, type ChartEntry } from "./chartKinds";
import { legendFor } from "./live";
import { DoDont, GSection, Grid, Rules, Tok, useT, WhenAvoid } from "./parts";

function SampleCard({ sample, lang }: { sample: ChartSample; lang: "pl" | "en" }) {
  // Samples are documented in Polish (titles and data labels); the page language stays for the controls.
  return (
    <div lang={sample.lang !== lang ? sample.lang : undefined} className="g-cardexample">
      <ChartCard
        lang={lang}
        title={sample.title}
        sub={sample.sub}
        chart={() => <ZChart {...sample} />}
        table={() => <TableView table={toTable(sample)} />}
        legend={legendFor(sample)}
        source={<span>{lang === "pl" ? "Dane przykładowe biblioteki wykresów" : "Chart library sample data"}</span>}
      />
    </div>
  );
}

function Placeholder({ entry }: { entry: ChartEntry }) {
  const { t, pl } = useT();
  return (
    <div className="g-chartph">
      <h3 className="zt-card__title" lang={pl ? undefined : "pl"}>
        {entry.titlePl}
      </h3>
      <p className="zt-card__sub" lang={pl ? undefined : "pl"}>
        {entry.subPl}
      </p>
      <div className="g-chartph__stage">
        <strong>{t("Przykład w przygotowaniu", "Example in preparation")}</strong>
        <span>
          {t(
            "Ten typ pojawi się tu na żywo, gdy biblioteka wykresów dostarczy próbkę (CHART_SAMPLES).",
            "This type will be drawn here live once the chart library provides a sample (CHART_SAMPLES).",
          )}
        </span>
      </div>
    </div>
  );
}

function ChartSpec({ entry }: { entry: ChartEntry }) {
  const { t, pl, lang } = useT();
  const anchor = chartAnchor(entry.type);
  const kind = pl ? entry.kindPl : entry.kindEn;
  return (
    <article className="g-chart" id={anchor} aria-label={kind}>
      <div className="g-chart__top">
        <span className="zt-kind">{kind}</span>
        <a className="g-chart__link" href={`#${anchor}`}>
          {t("Link", "Link")}
          <span className="zt-sr">
            {" "}
            {t("do typu", "to type")} {kind}
          </span>
        </a>
      </div>
      {entry.sample ? <SampleCard sample={entry.sample} lang={lang} /> : <Placeholder entry={entry} />}
      <WhenAvoid
        use={pl ? entry.usePl : entry.useEn}
        avoid={pl ? entry.avoidPl : entry.avoidEn}
        marks={pl ? entry.marksPl : entry.marksEn}
      />
    </article>
  );
}

const SWATCHES = {
  identity: ["series-1", "series-2", "series-3", "series-4", "series-5"],
  hero: ["series-1", "series-context"],
  seq: ["seq-1", "seq-2", "seq-3", "seq-4", "seq-5"],
  div: ["div-negative", "div-mid", "div-positive"],
  reference: ["series-reference", "series-reference-light", "band", "band-edge"],
};

function Strip({ names }: { names: string[] }) {
  return (
    <span className="g-strip">
      {names.map((n) => (
        <span key={n} className="g-strip__item">
          <i style={{ background: `var(--${n})` }} aria-hidden="true" />
          <Tok>{n}</Tok>
        </span>
      ))}
    </span>
  );
}

export function ChartsPage() {
  const { t, pl } = useT();
  const groups = chartEntries(CHART_SAMPLES);
  const live = groups.reduce((n, g) => n + g.entries.filter((e) => e.sample).length, 0);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  return (
    <>
      <GSection
        id="g-types"
        title={t("Typy według zadania", "Types by job")}
        lead={
          <>
            {t(
              `Wykres wybieramy według tego, co ma pokazać (grupy FT Visual Vocabulary i wytyczne ONS). Na żywo: ${live} z ${total}. Każdy typ ma własny link.`,
              `Choose a chart by what it must show (FT Visual Vocabulary groups, ONS guidance). Live: ${live} of ${total}. Every type has its own link.`,
            )}
          </>
        }
      >
        <nav className="g-jump" aria-label={t("Typy wykresów", "Chart types")}>
          {groups.map((g) => (
            <div key={g.job.key} className="g-jump__group">
              <p className="g-jump__job">{pl ? g.job.pl : g.job.en}</p>
              <ul>
                {g.entries.map((e) => (
                  <li key={e.type}>
                    <a href={`#${chartAnchor(e.type)}`}>{pl ? e.kindPl : e.kindEn}</a>
                  </li>
                ))}
                {g.job.key === "overview" ? (
                  <li>
                    <Link to="/przewodnik/pulpit#g-kpi">{t("Kafelek KPI", "KPI tile")}</Link>
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </nav>
        <Rules
          title={t("Nie używamy", "Not used")}
          items={[
            t(
              "Wykresów kołowych i pierścieniowych: zamiast nich słupki 100% lub słupek segmentowany.",
              "Pie and donut charts: use 100% bars or a segmented bar.",
            ),
            t("Wskaźników zegarowych: zamiast nich wykres pociskowy.", "Gauges: use a bullet chart."),
            t("Dwóch osi Y: dwa wykresy albo indeks do wspólnej podstawy.", "Dual axes: two charts or an index to a common base."),
            t("3D, radarów, chmur słów.", "3D, radar charts, word clouds."),
          ]}
        />
      </GSection>

      {groups.map((g) => (
        <GSection key={g.job.key} id={`g-job-${g.job.key}`} title={pl ? g.job.pl : g.job.en} lead={pl ? g.job.notePl : g.job.noteEn}>
          <div className="g-charts">
            {g.entries.map((e) => (
              <ChartSpec key={e.type} entry={e} />
            ))}
            {g.job.key === "overview" ? (
              <article className="g-chart" aria-label={t("Kafelek KPI", "KPI tile")}>
                <div className="g-chart__top">
                  <span className="zt-kind">{t("Kafelek KPI", "KPI tile")}</span>
                </div>
                <div className="g-chartph">
                  <h3 className="zt-card__title">{t("Kafelek to komponent strony", "The tile is a page component")}</h3>
                  <p className="g-muted">
                    {t(
                      "Liczba do zapamiętania z okresem, zmianą, kontekstem i źródłem. Reguły i żywy przykład: ",
                      "A number to remember with period, change, context and source. Rules and a live example: ",
                    )}
                    <Link to="/przewodnik/pulpit#g-kpi">{t("Pulpit → Kafelek KPI", "Dashboard → KPI tile")}</Link>.
                  </p>
                </div>
                <WhenAvoid
                  use={t("Pojedyncza wartość, którą czytelnik ma zapamiętać.", "A single value the reader should remember.")}
                  avoid={t("Wskaźniki zegarowe, pojedyncze słupki, pierścienie postępu.", "Gauges, single bars, progress rings.")}
                />
              </article>
            ) : null}
          </div>
        </GSection>
      ))}

      <GSection id="g-colour" title={t("Kolor według roli", "Colour by job")}>
        <ul className="g-colorjobs">
          <li>
            <h3 className="g-h3">{t("Tożsamość (kategorie)", "Identity (categorical)")}</h3>
            <Strip names={SWATCHES.identity} />
            <p>
              {t(
                "series-1 … series-5 w stałej kolejności, nigdy w kółko. Kolor idzie za obiektem: Polska to series-1 na każdym wykresie. Szósta seria trafia do „Pozostałe” albo do małych wielokrotności. series-3…series-5 mają poniżej 3:1 na białym: wykres z nimi musi mieć podpisy bezpośrednie lub tabelę.",
                "series-1 … series-5 in fixed order, never cycled. Colour follows the entity: Poland is series-1 on every chart. A 6th series folds into “Other” or small multiples. series-3…series-5 are below 3:1 on white: charts using them need direct labels or the table view.",
              )}
            </p>
          </li>
          <li>
            <h3 className="g-h3">{t("Bohater i kontekst", "Hero and context")}</h3>
            <Strip names={SWATCHES.hero} />
            <p>
              {t(
                "Jedna seria-bohater w series-1, reszta w series-context, podpisana bezpośrednio.",
                "One hero series in series-1, the rest in series-context, labelled directly.",
              )}
            </p>
          </li>
          <li>
            <h3 className="g-h3">{t("Wielkość (sekwencyjna, w klasach)", "Magnitude (sequential, binned)")}</h3>
            <Strip names={SWATCHES.seq} />
            <p>
              {t(
                "Jeden odcień od jasnego do ciemnego, nigdy jaśniej niż seq-1. Gdy komórki niosą liczby: cztery klasy (seq-1, seq-2, seq-4, seq-5), tekst ink na dwóch pierwszych, biały na dwóch ostatnich.",
                "One hue light to dark, never lighter than seq-1. When cells carry values use four classes (seq-1, seq-2, seq-4, seq-5): ink text on the first two, white on the last two.",
              )}
            </p>
          </li>
          <li>
            <h3 className="g-h3">{t("Biegunowość (rozbieżna)", "Polarity (diverging)")}</h3>
            <Strip names={SWATCHES.div} />
            <p>
              {t(
                "div-negative poniżej, div-positive powyżej, div-mid neutralnie; zawsze z linią zera i legendą.",
                "div-negative below, div-positive above, div-mid neutral; always with a zero line and a legend.",
              )}
            </p>
          </li>
          <li>
            <h3 className="g-h3">{t("Odniesienie", "Reference")}</h3>
            <Strip names={SWATCHES.reference} />
            <p>
              {t(
                "series-reference dla średnich i sum; band + przerywana band-edge dla zakresów docelowych.",
                "series-reference for averages and sums; band + dashed band-edge for target ranges.",
              )}
            </p>
          </li>
        </ul>
        <DoDont
          ok={t("Kolory statusu tylko w etykietach statusu.", "Status colours only in status tags.")}
          bad={t(
            "Zielony „dobrze”, czerwony „źle” na wykresie lub przy wartości.",
            "Green for “good”, red for “bad” in a chart or next to a value.",
          )}
          okNote={t(
            "Paleta kategorii przeszła walidator: pasmo jasności, minimum nasycenia, odróżnialność dla daltonistów ≥ 8 ΔE.",
            "The categorical set passed the validator: lightness band, chroma floor, colour-blind separation ≥ 8 ΔE.",
          )}
        />
      </GSection>

      <GSection id="g-marks" title={t("Znaczniki i anatomia", "Marks and anatomy")}>
        <Grid cols={2}>
          <Rules
            title={t("Linie, słupki, siatka", "Lines, bars, grid")}
            items={[
              t(
                "Linie 2–2,5 px (bohater 2,5 px), linie kontekstu 1,25 px; punkty ≥ 8 px z białą obwódką 1,5 px.",
                "Lines 2–2.5px (hero 2.5px), context lines 1.25px; markers ≥ 8px with a 1.5px white ring.",
              ),
              t(
                "Słupki: zaokrąglony koniec danych 2 px, odstęp 2 px między słupkami i segmentami, podstawa na zerze.",
                "Bars: 2px rounded data end, 2px surface gap between bars and segments, baseline at zero.",
              ),
              t(
                "Linie siatki: ciągłe 1 px grid, tylko poziome; linia zera series-reference-light.",
                "Gridlines: solid 1px grid, horizontal only; the zero line series-reference-light.",
              ),
              t(
                "Oś Y od zera dla słupków i obszarów; linie mogą zaczynać się wyżej, ale nigdy z ukrytą przerwą.",
                "Y axis from zero for bars and areas; lines may start elsewhere, but never with a hidden break.",
              ),
            ]}
          />
          <Rules
            title={t("Tekst i podpisy", "Text and labels")}
            items={[
              t(
                "Tekst osi chart-text 11 px ink-muted; podpisy danych 11–12 px ink (600 dla wyróżnionej wartości). Tekst nigdy w kolorze serii.",
                "Axis text chart-text 11px ink-muted; data labels 11–12px ink (600 for the highlighted value). Text is never in a series colour.",
              ),
              t(
                "Podpisy na końcach linii, gdzie się mieszczą; inaczej legenda pod wykresem. Nigdy liczba przy każdym punkcie.",
                "Direct labels at line ends where they fit; otherwise a legend under the chart. Never a number on every point.",
              ),
              t(
                "Adnotujemy jeden ważny moment (szczyt, zmiana polityki) kropką i krótkim podpisem.",
                "Annotate one moment that matters (peak, policy change) with a dot and a short label.",
              ),
            ]}
          />
        </Grid>
      </GSection>

      <GSection id="g-interaction" title={t("Interakcja", "Interaction")}>
        <Rules
          items={[
            t(
              "Najechanie i fokus klawiatury pokazują linię pionową i dymek (data, nazwa serii, wartość z jednostką). Dymek nigdy nie jest jedynym sposobem odczytu: tabela ma każdą liczbę.",
              "Hover and keyboard focus show a crosshair and a tooltip (date, series name, value with unit). The tooltip is never the only way to read a value: the table has every number.",
            ),
            t(
              "Przełącznik Wykres | Tabela na każdym wykresie; tabela ma ten sam tytuł, jednostki i źródło.",
              "Chart | Table toggle on every chart; the table has the same title, units and source.",
            ),
            <>
              {t("Wykres ma", "A chart has")} <Tok>role=&quot;img&quot;</Tok> {t("i", "and")} <Tok>aria-label</Tok>{" "}
              {t(
                "z wnioskiem w jednym zdaniu; ścieżki SVG nie są czytane.",
                "stating the finding in one sentence; the SVG paths are never read aloud.",
              )}
            </>,
            t(
              "Nazwy serii w dymku w kolorze ink, nigdy w kolorze serii; obok może stać próbka koloru.",
              "Series names in the tooltip in ink, never in the series colour; a swatch can sit beside the name.",
            ),
          ]}
        />
      </GSection>

      <GSection id="g-phone" title={t("Rozmiar tekstu i telefon", "Text size and phone")}>
        <Rules
          items={[
            t(
              "Wykresy rysujemy w prawdziwym rozmiarze ze stałymi rozmiarami pisma (oś 11 px, podpisy 11–12 px). Nigdy nie skalujemy SVG o stałym viewBox tak, że tekst spada poniżej 11 px; test UI to mierzy.",
              "Charts render at their real pixel size with fixed font sizes (axis 11px, labels 11–12px). Never scale a fixed-viewBox SVG so its text ends up below 11px; the UI test measures this.",
            ),
            t(
              "Poniżej 768 px wersje na telefon: viewBox szerokości 300 px, tekst 12 px (co najmniej 11 px na ekranie 360 px), mniej podziałek (3 lata zamiast 6), skrócone etykiety (II 2023), legenda zawija się pod wykresem.",
              "Below 768px phone variants: a 300px-wide viewBox, 12px text (11px or more on a 360px screen), fewer ticks (3 years instead of 6), shortened labels (II 2023), legends wrap under the chart.",
            ),
            t("Nigdy nie zmniejszamy wykresu z desktopu.", "Never scale a desktop chart down."),
          ]}
        />
      </GSection>

      <GSection id="g-numbers" title={t("Liczby na wykresach", "Numbers in charts")}>
        <DoDont
          ok={<span className="g-numex">2,9% · 37 490 tys. · 4,26 zł · 845 mld €</span>}
          bad={<span className="g-numex">2.9 % · 37490000 · 4,2634 zł · 845000000000 €</span>}
          okNote={t(
            "Przecinek dziesiętny, spacja tysięcy, jednostka w podtytule (nie przy każdej podziałce), oprócz % na osiach procentowych.",
            "Decimal comma, space for thousands, unit in the subtitle (not on every tick) except % on percentage axes.",
          )}
          badNote={t(
            "Zaokrąglamy do tego, co wspiera źródło: stopy 1 miejsce, kursy 2, liczebności w tys./mln/mld.",
            "Round to what the source supports: rates 1 decimal, exchange rates 2, counts with tys./mln/mld.",
          )}
        />
      </GSection>
    </>
  );
}
