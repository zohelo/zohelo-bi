// Live examples shared by guide pages: a legend from the chart library's legend items, and a chart card
// with real (sample) data from the data layer drawn by ZChart, exactly as dashboard pages build it.

import { useState } from "react";
import { legendItems, toTable, ZChart, ZLegend, type ZChartProps } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data } from "../../data";
import { usePage } from "../context";
import { ChartCard, ChartState, Segmented, type CardState } from "../ui/blocks";
import { TableView } from "../ui/TableView";
import { KpiInfo } from "../ui/KpiInfo";
import { fmtPeriod, fmtValue } from "../format";
import { fmtDay } from "./util";
import { periodFormatter, sourceName, toZSeries, zUnit } from "../chartData";

/** Legend for 2+ items (design template: legend under the chart for 2+ series). */
export function legendFor(p: ZChartProps) {
  const items = legendItems(p);
  return items.length >= 2 ? <ZLegend items={items} /> : undefined;
}

/** Where a last value sits against a target band, as words for a title that states the finding. */
export function bandFinding(last: number, band: [number, number], lang: "pl" | "en"): string {
  if (last < band[0]) return lang === "pl" ? "poniżej pasma celu NBP" : "below the NBP target band";
  if (last > band[1]) return lang === "pl" ? "powyżej pasma celu NBP" : "above the NBP target band";
  return lang === "pl" ? "w paśmie celu NBP" : "within the NBP target band";
}

const KPI = "hicp_annual_rate";
const BAND: [number, number] = [1.5, 3.5];

type Period = "1y" | "5y" | "10y" | "max";
const PERIODS: { value: Period; pl: string; en: string; years: number }[] = [
  { value: "1y", pl: "1 rok", en: "1 year", years: 1 },
  { value: "5y", pl: "5 lat", en: "5 years", years: 5 },
  { value: "10y", pl: "10 lat", en: "10 years", years: 10 },
  { value: "max", pl: "Wszystko", en: "All", years: 0 },
];

/** HICP inflation for Poland as a line + band chart card, from the data layer, with the same tools as a dashboard card. */
export function LiveHicpCard({ span = 12 }: { span?: 12 | 8 | 6 | 4 }) {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const [period, setPeriod] = useState<Period>("10y");
  const all = useData(catalog ? `guide-${KPI}-all` : null, () => data.series(KPI, {}));
  const kpi = catalog?.kpis.find((k) => k.kpi_key === KPI);
  const lastYear = Number(all.data?.[0]?.points.at(-1)?.period.slice(0, 4) ?? 0);
  const n = PERIODS.find((x) => x.value === period)!.years;
  const cut = n ? lastYear - n + 1 : 0;
  const series = {
    ...all,
    data: all.data?.map((s) => ({ ...s, points: s.points.filter((p) => Number(p.period.slice(0, 4)) >= cut) })),
  };
  const pts = series.data?.[0]?.points.filter((p) => p.value !== null) ?? [];
  const last = pts[pts.length - 1];
  const first = pts[0];
  const range = first && last ? `${first.period.slice(0, 4)}–${last.period.slice(0, 4)}` : "";
  const finding = last ? bandFinding(last.value!, BAND, lang) : "";
  const title = last
    ? pl
      ? `Inflacja ${finding} (${fmtPeriod(last.period, lang)}: ${fmtValue(last.value, "pct", catalog, lang)})`
      : `Inflation ${finding} (${fmtPeriod(last.period, lang)}: ${fmtValue(last.value, "pct", catalog, lang)})`
    : pl
      ? "Inflacja HICP w Polsce"
      : "HICP inflation in Poland";
  const sub = pl ? `HICP r/r, %, miesięcznie, ${range}` : `HICP y/y, %, monthly, ${range}`;
  const chart: ZChartProps | undefined =
    series.data && kpi
      ? {
          type: "line-band",
          series: toZSeries(series.data, catalog, lang),
          unit: zUnit(catalog, kpi.unit_key, last?.value ?? 1),
          lang,
          ariaLabel: title,
          band: BAND,
          bandLabel: pl ? "Pasmo celu NBP 1,5–3,5%" : "NBP target band 1.5–3.5%",
          formatPeriod: periodFormatter(lang),
          height: 240,
        }
      : undefined;
  const src = series.data?.[0]?.source_key;
  return (
    <ChartCard
      span={span}
      lang={lang}
      title={title}
      sub={sub}
      state={series.error ? { kind: "error", text: series.error } : chart ? undefined : { kind: "loading" }}
      tools={
        <Segmented<Period>
          small
          label={(pl ? "Okres wykresu: " : "Chart period: ") + (pl ? "Inflacja HICP w Polsce" : "HICP inflation in Poland")}
          value={period}
          onChange={setPeriod}
          options={PERIODS.map((x) => ({ value: x.value, label: pl ? x.pl : x.en }))}
        />
      }
      chart={() => (chart ? <ZChart {...chart} /> : null)}
      table={() => (chart ? <TableView table={toTable(chart)} /> : null)}
      copyData={() => (chart ? toTable(chart) : undefined)}
      sourceText={
        src
          ? `${pl ? "Źródło" : "Source"}: ${sourceName(catalog, src, lang)}${catalog?.sample ? (pl ? " · dane przykładowe" : " · sample data") : ""}`
          : undefined
      }
      info={kpi && catalog ? <KpiInfo kpi={kpi} cat={catalog} lang={lang} /> : undefined}
      legend={chart ? legendFor(chart) : undefined}
      source={
        <>
          <span>
            {pl ? "Źródło: " : "Source: "}
            {src ? sourceName(catalog, src, lang) : "…"} (prc_hicp_manr)
          </span>
          <span>
            {pl ? "Dane z " : "Data from "}
            {fmtDay(catalog?.generated_at, lang)}
            {catalog?.sample ? (pl ? " · dane przykładowe" : " · sample data") : ""}
          </span>
        </>
      }
    />
  );
}

type StateKind = "loading" | "empty" | "na" | "error";

/** The four non-happy chart-card states, switchable, rendered by the real ChartState. */
export function StatesDemo() {
  const { lang } = usePage();
  const pl = lang === "pl";
  const [kind, setKind] = useState<StateKind>("loading");
  const states: Record<StateKind, CardState> = {
    loading: { kind: "loading" },
    empty: {
      kind: "empty",
      text: pl
        ? "Brak danych dla wybranego okresu. Wybierz dłuższy okres, np. 10 lat."
        : "No data for the selected period. Choose a longer period, e.g. 10 years.",
    },
    na: {
      kind: "na",
      text: pl
        ? "Dane tylko krajowe: ten wskaźnik nie ma podziału na województwa."
        : "National data only: this indicator has no voivodeship breakdown.",
    },
    error: {
      kind: "error",
      text: pl ? "Serwer danych nie odpowiedział w ciągu 10 sekund." : "The data server did not answer within 10 seconds.",
      retry: () => setKind("loading"),
    },
  };
  const notes: Record<StateKind, string> = {
    loading: pl ? 'Szkielet w tej samej wysokości, aria-busy="true".' : 'Skeleton at the same height, aria-busy="true".',
    empty: pl ? "Mówi, czego brakuje i jak to zmienić." : "Says what is missing and how to change it.",
    na: pl ? "Mówi, dlaczego wykres tu nie pasuje." : "Says why the chart does not apply here.",
    error: pl
      ? 'Co się nie udało + Spróbuj ponownie; role="alert", więc czytnik ogłasza go od razu.'
      : 'What failed + Try again; role="alert", so screen readers announce it at once.',
  };
  return (
    <div className="g-statesdemo">
      <Segmented
        label={pl ? "Pokaż stan karty wykresu" : "Show chart card state"}
        value={kind}
        onChange={setKind}
        options={[
          { value: "loading", label: pl ? "Wczytywanie" : "Loading" },
          { value: "empty", label: pl ? "Brak danych" : "Empty" },
          { value: "na", label: pl ? "Nie dotyczy" : "Not applicable" },
          { value: "error", label: pl ? "Błąd" : "Error" },
        ]}
      />
      <div className="zt-card g-statesdemo__card">
        <ChartState lang={lang} state={states[kind]} />
      </div>
      <p className="g-muted">{notes[kind]}</p>
    </div>
  );
}
