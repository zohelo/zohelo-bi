// Biblioteka wykresów (chart library v2, docs/chart-library-proposal.md): chart TYPES grouped by job, each with
// its named VARIANTS drawn live by ZChart, filters by function and style; then colour by job, marks, interaction,
// phone and number formatting.

import { useState } from "react";
import {
  CHART_FUNCTIONS,
  CHART_STYLES,
  FUNCTION_INFO,
  GROUP_INFO,
  LIBRARY,
  PICKER_GROUPS,
  STYLE_INFO,
  VARIANTS,
  toTable,
  ZChart,
  type ChartFunction,
  type ChartSample,
  type ChartStyle,
  type ChartTypeDef,
  type ChartVariant,
} from "@zohelo/visuals";
import { CHART_SAMPLES } from "@zohelo/visuals/samples";
import { ChartCard } from "../ui/blocks";
import { TableView } from "../ui/TableView";
import { CHART_KINDS, typeAnchor, variantAnchor, variantSample } from "./chartKinds";
import { legendFor } from "./live";
import { DoDont, GSection, Grid, Rules, Tok, useT, WhenAvoid } from "./parts";
import "./charts.css";

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

/** Titles shared by several variant samples: those cards add the variant name, so every card has its own name. */
const SHARED_TITLES = (() => {
  const n = new Map<string, number>();
  for (const v of VARIANTS) {
    const title = variantSample(v, CHART_SAMPLES).title;
    n.set(title, (n.get(title) ?? 0) + 1);
  }
  return new Set([...n].filter(([, c]) => c > 1).map(([k]) => k));
})();

function VariantSpec({ v }: { v: ChartVariant }) {
  const { t, pl, lang } = useT();
  const own = variantSample(v, CHART_SAMPLES);
  const sample = SHARED_TITLES.has(own.title) ? { ...own, title: `${own.title} (${v.pl.toLowerCase()})` } : own;
  const anchor = variantAnchor(v.id);
  const name = pl ? v.pl : v.en;
  const rules = CHART_KINDS[v.chart];
  return (
    <article className="g-chart" id={anchor} aria-label={name}>
      <div className="g-chart__top">
        <span className="zt-kind">{name}</span>
        <span className="g-chart__tags">
          {v.styles.map((st) => (
            <span key={st} className="zt-tag">
              {(pl ? STYLE_INFO[st].pl : STYLE_INFO[st].en).replace(/ \(.*\)$/, "")}
            </span>
          ))}
        </span>
        <a className="g-chart__link" href={`#${anchor}`}>
          {t("Link", "Link")}
          <span className="zt-sr">
            {" "}
            {t("do wariantu", "to variant")} {name}
          </span>
        </a>
      </div>
      <SampleCard sample={sample} lang={lang} />
      <WhenAvoid
        use={pl ? v.usePl : v.useEn}
        avoid={rules ? (pl ? rules.avoidPl : rules.avoidEn) : ""}
        marks={rules ? (pl ? rules.marksPl : rules.marksEn) : undefined}
      />
    </article>
  );
}

function TypeSection({ type, match }: { type: ChartTypeDef; match: (v: ChartVariant) => boolean }) {
  const { t, pl } = useT();
  const vs = type.variants.filter(match);
  return (
    <section className="g-type" id={typeAnchor(type.id)} aria-labelledby={`${typeAnchor(type.id)}-h`}>
      <h3 className="g-type__h" id={`${typeAnchor(type.id)}-h`}>
        {pl ? type.pl : type.en}
        {type.core ? <span className="zt-tag g-type__core">{t("podstawowy", "core")}</span> : null}
        <span className="g-muted g-type__n">
          {vs.length} {t(vs.length === 1 ? "wariant" : vs.length < 5 ? "warianty" : "wariantów", vs.length === 1 ? "variant" : "variants")}
        </span>
      </h3>
      <div className="g-charts">
        {vs.map((v) => (
          <VariantSpec key={v.id} v={v} />
        ))}
      </div>
    </section>
  );
}

function FilterRow<T extends string>({
  label,
  all,
  values,
  on,
  set,
  name,
}: {
  label: string;
  all: string;
  values: readonly T[];
  on: T | null;
  set: (v: T | null) => void;
  name: (v: T) => string;
}) {
  return (
    <div className="g-filter" role="group" aria-label={label}>
      <span className="small g-filter__label">{label}</span>
      <button type="button" className="zt-chip g-filter__chip" aria-pressed={on === null} onClick={() => set(null)}>
        {all}
      </button>
      {values.map((v) => (
        <button key={v} type="button" className="zt-chip g-filter__chip" aria-pressed={on === v} onClick={() => set(v)}>
          {name(v)}
        </button>
      ))}
    </div>
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
  const [fn, setFn] = useState<ChartFunction | null>(null);
  const [style, setStyle] = useState<ChartStyle | null>(null);
  const match = (v: ChartVariant) => (!fn || v.functions.includes(fn)) && (!style || v.styles.includes(style));
  const types = LIBRARY.filter((ty) => ty.variants.some(match));
  const shown = types.reduce((n, ty) => n + ty.variants.filter(match).length, 0);
  return (
    <>
      <GSection
        id="g-types"
        title={t("Typy wykresów", "Chart types")}
        lead={t(
          `${LIBRARY.length} typów wykresów, każdy z gotowymi wariantami (razem ${VARIANTS.length}): czytelnik wybiera typ, potem wariant, bez ustawiania wykresu od zera. Zadanie i styl to filtry, nie osobne grupy. Wszystkie style mają jedną paletę zohelo: styl zmienia notację, nie kolory. Każdy typ i wariant ma własny link.`,
          `${LIBRARY.length} chart types, each with ready-made variants (${VARIANTS.length} in all): the reader picks a type, then a variant, without building a chart from scratch. Job and style are filters, not separate groups. Every style uses the one zohelo palette: a style changes notation, not colours. Every type and variant has its own link.`,
        )}
      >
        <div className="g-filters">
          <FilterRow
            label={t("Zadanie", "Job")}
            all={t("Wszystkie", "All")}
            values={CHART_FUNCTIONS}
            on={fn}
            set={setFn}
            name={(f) => (pl ? FUNCTION_INFO[f].pl : FUNCTION_INFO[f].en)}
          />
          <FilterRow
            label={t("Styl", "Style")}
            all={t("Wszystkie", "All")}
            values={CHART_STYLES}
            on={style}
            set={setStyle}
            name={(st) => (pl ? STYLE_INFO[st].pl : STYLE_INFO[st].en).replace(/ \(.*\)$/, "")}
          />
          <p className="small g-muted" role="status">
            {t(`Pokazano ${shown} z ${VARIANTS.length} wariantów.`, `Showing ${shown} of ${VARIANTS.length} variants.`)}
            {style ? ` ${pl ? STYLE_INFO[style].notePl : STYLE_INFO[style].noteEn}` : ""}
          </p>
        </div>
        <nav className="g-jump" aria-label={t("Typy wykresów", "Chart types")}>
          {PICKER_GROUPS.map((g) => {
            const ts = types.filter((ty) => ty.group === g);
            if (!ts.length) return null;
            return (
              <div key={g} className="g-jump__group">
                <p className="g-jump__job">{pl ? GROUP_INFO[g].pl : GROUP_INFO[g].en}</p>
                <ul>
                  {ts.map((ty) => (
                    <li key={ty.id}>
                      <a href={`#${typeAnchor(ty.id)}`}>{pl ? ty.pl : ty.en}</a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
        <Rules
          title={t("Nie używamy", "Not used")}
          items={[
            t(
              "Wykresów kołowych z więcej niż pięcioma częściami: wtedy słupki 100%, słupek segmentowany lub mapa drzewa.",
              "Pie charts with more than five parts: use 100% bars, a segmented bar or a treemap.",
            ),
            t(
              "Wskaźników zegarowych i lejków: zamiast nich wykres pociskowy lub słupki.",
              "Gauges and funnels: use a bullet chart or bars.",
            ),
            t(
              "Dwóch osi Y: dwa wykresy, indeks do wspólnej podstawy albo kolumny + linia w tej samej jednostce.",
              "Dual axes: two charts, an index to a common base, or columns + line in the same unit.",
            ),
            t("3D, radarów, chmur słów, wykresów sieciowych.", "3D, radar charts, word clouds, network charts."),
            t(
              "Świec (candlestick, OHLC): żadne źródło w katalogu nie ma kursów otwarcia, maksimum, minimum i zamknięcia.",
              "Candlesticks (OHLC): no source in the catalogue has open, high, low and close values.",
            ),
            t(
              "Zielonego i czerwonego bez ustalonego kierunku: w stylu biznesowym kolor oceny tylko dla wskaźników z biegunowością (polarity.ts), zawsze ze znakiem i liczbą.",
              "Green and red without an agreed direction: in the business style the verdict colour is used only for indicators with a polarity (polarity.ts), always with sign and number.",
            ),
          ]}
        />
      </GSection>

      {PICKER_GROUPS.map((g) => {
        const ts = types.filter((ty) => ty.group === g);
        if (!ts.length) return null;
        return (
          <GSection key={g} id={`g-group-${g}`} title={pl ? GROUP_INFO[g].pl : GROUP_INFO[g].en}>
            {ts.map((ty) => (
              <TypeSection key={ty.id} type={ty} match={match} />
            ))}
          </GSection>
        );
      })}

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
              "Kopiuj na każdym wykresie: obraz z tytułem, legendą i źródłem albo dane jako tabela z tym samym tytułem, jednostkami i źródłem.",
              "Copy on every chart: an image with title, legend and source, or the data as a table with the same title, units and source.",
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
