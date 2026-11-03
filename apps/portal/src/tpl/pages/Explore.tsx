// Eksplorator (design template: Explorer page type): query panel on the left (stacks above the chart below
// 1400px), chart card and data table on the right; they change together and the URL stores the whole view.

import { useEffect, useMemo, useState } from "react";
import { useData } from "../../components/useData";
import type { Catalog, Kpi } from "../../data";
import { Link, navigate } from "../../router";
import { browserStorage, loadViews, removeView, saveView, type SavedView } from "../../savedViews";
import { ZChart, legendItems, type ZChartProps, type ZSeries } from "@zohelo/visuals";
import { useMeta, usePage } from "../context";
import { freqLabel } from "../format";
import { kpiName, sourceName, toZSeries } from "../chartData";
import { ActionMenu, ChartState, PageHeader, StatusTag, type CardState } from "../ui/blocks";
import { CopyButton } from "../explore/actions";
import { fmtFor, rankGeos, rankedBars, tileMap, unitFor, type Fmt, type Ranked } from "../explore/charts";
import { buildCsv, csvFileName, downloadCsv, type CsvTable } from "../explore/csv";
import { defaultState, normaliseState, parseExplore, serialiseExplore, type ExState } from "../explore/exploreState";
import { ExplorePanel } from "../explore/ExplorePanel";
import { findingTitle, ranking } from "../explore/findings";
import { unitName, voivodeshipKeys } from "../explore/kpiInfo";
import { plural } from "../explore/search";
import { exportMeta, licenceOf, matrixCsv, registerId, seriesMatrix } from "../explore/sources";
import { DataTable, Legend, type ShownTable } from "../explore/ui";
import { seriesWindow } from "../explore/fetch";
import "../explore/explore.css";

export function ExplorePage() {
  const { lang, catalog, url } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Eksplorator danych" : "Data explorer";
  const crumb = pl ? "Eksplorator" : "Explorer";

  // The view is parsed from the URL once the catalogue is known, and again when the URL changes from
  // outside (back/forward, a saved view, a link from another page).
  const [state, setState] = useState<ExState | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  if (catalog && seen !== url.search) {
    setSeen(url.search);
    const next = parseExplore(url.search, catalog);
    if (!state || !next || serialiseExplore(next) !== serialiseExplore(state)) setState(next);
  }
  const qs = state ? serialiseExplore(state) : "";
  useEffect(() => {
    if (qs && window.location.pathname.startsWith("/explore") && window.location.search !== qs)
      window.history.replaceState(null, "", `/explore${qs}`);
  }, [qs]);

  const kpi = state && catalog ? catalog.kpis.find((k) => k.kpi_key === state.kpi) : undefined;
  const [views, setViews] = useState<SavedView[]>(() => loadViews(browserStorage()));
  const [status, setStatus] = useState("");

  const result = useExploreData(catalog, kpi, state);
  const csv = () => {
    if (!catalog || !kpi || !state || !result.view) return;
    const meta = exportMeta(catalog, kpi, state.sources, lang, { title: result.view.title, url: window.location.href });
    downloadCsv(csvFileName(kpi.kpi_key), buildCsv(meta, result.view.csv));
  };

  useMeta(
    title,
    [{ label: crumb }],
    <>
      <CopyButton
        lang={lang}
        label={pl ? "Kopiuj link" : "Copy link"}
        done={pl ? "Skopiowano link" : "Link copied"}
        className="zt-btn ex-hide-phone"
      />
      <button type="button" className="zt-btn zt-btn--primary" onClick={csv} disabled={!result.view}>
        {pl ? "Pobierz CSV" : "Download CSV"}
      </button>
    </>,
    [lang, qs, result.view ? result.key : ""],
  );

  if (!catalog || !state || !kpi)
    return (
      <>
        <PageHeader title={title} />
        <div className="zt-state" aria-busy={!catalog || undefined}>
          {catalog ? (pl ? "Katalog nie ma wskaźników." : "The catalogue has no indicators.") : pl ? "Wczytywanie" : "Loading"}
        </div>
      </>
    );

  const change = (patch: Partial<ExState>) => setState((s) => (s ? normaliseState({ ...s, ...patch }, kpi, catalog) : s));
  const pickKpi = (key: string) => {
    const k = catalog.kpis.find((x) => x.kpi_key === key);
    if (k) setState(normaliseState({ ...defaultState(k, catalog), view: state.view === "map" ? "line" : state.view }, k, catalog));
  };
  const save = () => {
    const name = result.view?.title ? `${kpiName(kpi, lang)}: ${result.view.title}` : kpiName(kpi, lang);
    setViews(saveView(browserStorage(), { name, url: `/explore${qs}` }));
    setStatus(pl ? `Zapisano widok „${kpiName(kpi, lang)}”.` : `Saved the view “${kpiName(kpi, lang)}”.`);
  };

  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Wybierz wskaźnik, obszar i źródła; wykres i tabela zmieniają się razem, a link zapisuje cały widok."
            : "Choose an indicator, areas and sources; the chart and table change together and the link stores the whole view."
        }
        right={catalog.sample ? <StatusTag kind="sample">{pl ? "Dane przykładowe" : "Sample data"}</StatusTag> : undefined}
      />
      <div className="ex-layout">
        <div className="ex-layout__side">
          <ExplorePanel
            cat={catalog}
            kpi={kpi}
            state={state}
            lang={lang}
            swatch={result.swatch}
            onChange={change}
            onPickKpi={pickKpi}
            onClear={() => {
              setState(defaultState(kpi, catalog));
              setStatus(pl ? "Przywrócono domyślny widok." : "Default view restored.");
            }}
            onSave={save}
          />
          <p className="zt-sr" role="status">
            {status}
          </p>
          <SavedViews views={views} lang={lang} onRemove={(id) => setViews(removeView(browserStorage(), id))} />
        </div>
        <div className="ex-layout__main">
          <ResultCards cat={catalog} kpi={kpi} state={state} lang={lang} result={result} onCsv={csv} />
        </div>
      </div>
    </>
  );
}

type ViewModel = {
  title: string;
  sub: string;
  chart: ZChartProps | null;
  table: ShownTable;
  csv: CsvTable;
  note?: string;
};

type ExploreData = { key: string; state: CardState | null; view: ViewModel | null; swatch: (geo: string) => string | undefined };

function useExploreData(cat: Catalog | undefined, kpi: Kpi | undefined, s: ExState | null): ExploreData {
  const { lang } = usePage();
  const pl = lang === "pl";
  const key = s && kpi ? JSON.stringify([s.kpi, s.areas, s.sources, s.split, s.from, s.to]) : null;
  const series = useData(key, () =>
    seriesWindow(s!.kpi, {
      geographies: s!.areas,
      sources: s!.sources,
      split: s!.split ?? undefined,
      from: String(s!.from),
      to: String(s!.to),
    }),
  );
  const mapKey = s && kpi && cat && s.view === "map" ? JSON.stringify(["map", s.kpi, s.sources[0], s.to]) : null;
  const mapSeries = useData(mapKey, () =>
    seriesWindow(s!.kpi, { geographies: voivodeshipKeys(cat!), sources: [s!.sources[0]!], from: String(s!.to), to: String(s!.to) }),
  );

  return useMemo((): ExploreData => {
    const none: ExploreData = { key: "", state: { kind: "loading" }, view: null, swatch: () => undefined };
    if (!cat || !kpi || !s) return none;
    const fmt = fmtFor(cat, kpi, lang);
    const err = series.error ?? (s.view === "map" ? mapSeries.error : undefined);
    if (err) return { ...none, state: { kind: "error", text: err } };
    if (!series.data || series.loading || (s.view === "map" && (!mapSeries.data || mapSeries.loading))) return none;
    const zs = toZSeries(series.data, cat, lang, { hero: "PL" });
    const items = legendItems({ type: "line-highlight", series: zs, unit: unitFor(cat, kpi, zs), lang, ariaLabel: "" });
    const swatch = (geo: string) => {
      const i = zs.findIndex((z) => z.id.split("|")[0] === geo);
      return i >= 0 && zs.length > 1 && s.view === "line" ? items[i]?.color : undefined;
    };
    const view = buildView(cat, kpi, s, zs, s.view === "map" ? rankGeos(mapSeries.data ?? [], cat, lang) : [], fmt, lang);
    const empty = !zs.some((z) => z.points.some((p) => p.y !== null));
    return {
      key: key ?? "",
      state: empty
        ? {
            kind: "empty",
            text: pl
              ? "Brak danych dla wybranego okresu. Zmień okres albo obszar."
              : "No data for this period. Change the period or areas.",
          }
        : null,
      view,
      swatch,
    };
  }, [cat, kpi, s, series, mapSeries, lang, key, pl]);
}

function buildView(cat: Catalog, kpi: Kpi, s: ExState, zs: ZSeries[], voiv: Ranked[], fmt: Fmt, lang: "pl" | "en"): ViewModel {
  const pl = lang === "pl";
  const unit = unitFor(cat, kpi, zs);
  const range = s.from === s.to ? String(s.from) : `${s.from}–${s.to}`;
  const n = zs.length;
  const base = `${unitName(cat, kpi.unit_key, lang)}, ${freqLabel(kpi.frequency, lang)}, ${range}`;
  const sub = `${base} · ${n} ${plural(n, lang, ["seria", "serie", "serii"], ["series", "series"])}`;
  const matrix = seriesMatrix(zs);
  const periodCol = pl ? "Okres" : "Period";
  const matrixTable: ShownTable = {
    caption: `${kpiName(kpi, lang)}, ${base}`,
    columns: [periodCol, ...matrix.labels],
    numeric: [false, ...matrix.labels.map(() => true)],
    rows: matrix.periods.map((p, i) => ({
      key: p,
      cells: [fmt.period(p), ...matrix.values[i]!.map((v) => (v === null ? "–" : fmt.value(v)))],
    })),
  };
  const rankTable = (
    rows: { key: string; label: string; period: string; value: number }[],
    caption: string,
    hero?: string,
    first = pl ? "Seria" : "Series",
  ): ShownTable => ({
    caption,
    columns: [first, periodCol, pl ? "Wartość" : "Value"],
    numeric: [false, false, true],
    rows: rows.map((r) => ({ key: r.key, strong: r.key === hero, cells: [r.label, fmt.period(r.period), fmt.value(r.value)] })),
  });
  const rankCsv = (rows: Ranked[]): CsvTable => ({
    columns: [pl ? "seria" : "series", pl ? "okres" : "period", pl ? "wartość" : "value"],
    rows: rows.map((r) => [r.label, r.period, r.value]),
  });

  if (s.view === "map") {
    const title = voiv.length
      ? findingTitle(
          voiv.map((r) => ({ id: r.key, label: r.label, points: [{ x: r.period, y: r.value }] })),
          fmt,
          lang,
        )
      : pl
        ? "Brak danych wojewódzkich"
        : "No voivodeship data";
    const period = voiv[0]?.period ?? String(s.to);
    const chart: ZChartProps = {
      ...tileMap(voiv, cat, { unit, lang, ariaLabel: title, highlight: s.areas.find((g) => g !== "PL"), seriesLabel: fmt.period(period) }),
      height: 300,
    };
    return {
      title,
      sub: `${unitName(cat, kpi.unit_key, lang)}, ${fmt.period(period)}, 16 ${pl ? "województw" : "voivodeships"} · ${sourceName(cat, s.sources[0]!, lang)}`,
      chart,
      table: rankTable(voiv, `${kpiName(kpi, lang)}, ${fmt.period(period)}`, undefined, pl ? "Województwo" : "Voivodeship"),
      csv: rankCsv(voiv),
      note: pl
        ? "Mapa pokazuje wszystkie województwa w ostatnim okresie zakresu; podział i dodatkowe źródła jej nie dotyczą."
        : "The map shows all voivodeships in the last period of the range; breakdown and extra sources do not apply.",
    };
  }

  const title = findingTitle(zs, fmt, lang);
  if (s.view === "bars" && n > 1) {
    const r = ranking(zs).map((x) => ({ key: x.id, label: x.label, period: x.x, value: x.y }));
    const hero = zs.find((z) => z.role === "hero")?.id;
    return {
      title,
      sub: `${unitName(cat, kpi.unit_key, lang)}, ${pl ? "ostatni okres" : "latest period"} ${range} · ${n} ${plural(n, lang, ["seria", "serie", "serii"], ["series", "series"])}`,
      chart: {
        ...rankedBars(r, { unit, lang, ariaLabel: title, highlight: hero, seriesLabel: unitName(cat, kpi.unit_key, lang) }),
        height: Math.max(160, r.length * 30 + 40),
      },
      table: rankTable(r, title, hero),
      csv: rankCsv(r),
    };
  }
  const chart: ZChartProps | null =
    s.view === "table"
      ? null
      : {
          type: s.view === "bars" ? "columns" : "line-highlight",
          series: zs,
          unit,
          lang,
          ariaLabel: title,
          formatPeriod: fmt.period,
          height: 320,
        };
  return { title, sub, chart, table: matrixTable, csv: matrixCsv(matrix, pl ? "okres" : "period") };
}

function ResultCards({
  cat,
  kpi,
  state,
  lang,
  result,
  onCsv,
}: {
  cat: Catalog;
  kpi: Kpi;
  state: ExState;
  lang: "pl" | "en";
  result: ExploreData;
  onCsv: () => void;
}) {
  const pl = lang === "pl";
  const v = result.view;
  const sources = state.view === "map" ? state.sources.slice(0, 1) : state.sources;
  const sourceLine = (
    <>
      <span>
        {pl ? "Źródło: " : "Source: "}
        {sources.map((s) => `${sourceName(cat, s, lang)} (${registerId(cat, s)})`).join(", ")}
        {" · "}
        {pl ? "licencja " : "licence "}
        {[...new Set(sources.map((s) => licenceOf(cat, s)?.name ?? "–"))].join(", ")}
      </span>
      {cat.sample ? <span>{pl ? "Dane przykładowe" : "Sample data"}</span> : null}
    </>
  );
  const heading = v?.title ?? kpiName(kpi, lang);
  const tableLabel = (pl ? "Tabela: " : "Table: ") + heading;
  return (
    <>
      <section className="zt-card t-card ex-result" aria-labelledby="ex-chart-h">
        <div className="zt-card__head">
          <div className="t-card__titles">
            <p className="caption ex-muted ex-m0">{kpiName(kpi, lang)}</p>
            <h2 className="zt-card__title" id="ex-chart-h">
              {heading}
            </h2>
            <p className="zt-card__sub">{v?.sub ?? `${unitName(cat, kpi.unit_key, lang)}, ${freqLabel(kpi.frequency, lang)}`}</p>
          </div>
          <div className="t-card__tools">
            <ActionMenu
              label={(pl ? "Więcej akcji: " : "More actions: ") + heading}
              items={[
                { label: pl ? "Pobierz CSV" : "Download CSV", onSelect: onCsv },
                {
                  label: pl ? "Kopiuj link do widoku" : "Copy link to view",
                  onSelect: () => void navigator.clipboard?.writeText(window.location.href).catch(() => undefined),
                },
                "sep",
                {
                  label: pl ? "Strona wskaźnika" : "Indicator page",
                  onSelect: () => navigate(`/kpi/${kpi.kpi_key}`),
                },
              ]}
            />
          </div>
        </div>
        <div className="t-card__body" aria-live="polite" aria-busy={result.state?.kind === "loading" || undefined}>
          {result.state ? (
            <ChartState state={result.state} lang={lang} />
          ) : v?.chart ? (
            <ZChart {...v.chart} />
          ) : v ? (
            <DataTable table={v.table} label={tableLabel} maxHeight />
          ) : null}
        </div>
        {v?.chart && !result.state ? <Legend chart={v.chart} /> : null}
        {v?.note && !result.state ? <p className="caption ex-muted ex-m0">{v.note}</p> : null}
        <div className="zt-card__foot">{sourceLine}</div>
      </section>

      {v && v.chart && !result.state ? (
        <section className="zt-card ex-tablecard" aria-labelledby="ex-table-h">
          <div className="ex-tablecard__head">
            <h2 className="card-title ex-m0" id="ex-table-h">
              {pl ? "Tabela" : "Table"} <span className="small ex-muted">· {unitName(cat, kpi.unit_key, lang)}</span>
            </h2>
            <span className="caption ex-muted">{pl ? "Te same liczby co na wykresie" : "The same numbers as the chart"}</span>
          </div>
          <DataTable table={v.table} label={tableLabel} />
        </section>
      ) : null}
    </>
  );
}

function SavedViews({ views, lang, onRemove }: { views: SavedView[]; lang: "pl" | "en"; onRemove: (id: string) => void }) {
  const pl = lang === "pl";
  if (!views.length) return null;
  return (
    <section className="zt-card ex-saved" aria-labelledby="ex-saved-h">
      <h2 className="card-title ex-m0" id="ex-saved-h">
        {pl ? "Zapisane widoki" : "Saved views"} <span className="small ex-muted">({views.length})</span>
      </h2>
      <p className="caption ex-muted ex-m0">{pl ? "Zapisane w tej przeglądarce." : "Stored in this browser."}</p>
      <ul className="ex-saved__list">
        {views.slice(0, 8).map((v) => (
          <li key={v.id}>
            <Link to={v.url} className="small">
              {v.name}
            </Link>
            <button
              type="button"
              className="ex-iconbtn"
              aria-label={(pl ? "Usuń widok: " : "Remove view: ") + v.name}
              onClick={() => onRemove(v.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
