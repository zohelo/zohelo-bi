// Eksplorator danych (design template: Explorer page type). Page header with "Pobierz CSV" and "Zapisz widok";
// one query bar of filter buttons with popovers (Wskaźniki, Obszar, shared dimensions, Okres, Wykres, saved
// views); the chart card below at full width: generated title and subtitle, the chart (one, or panels),
// legend, notes and source. The URL holds the whole query, so a link, a refresh or Back reproduces the view.

import { useEffect, useMemo, useState } from "react";
import { useData } from "../../components/useData";
import { data, type Catalog, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { Link, navigate } from "../../router";
import { browserStorage, loadViews, removeView, saveView, type SavedView } from "../../savedViews";
import { ZChart } from "@zohelo/visuals";
import { useMeta, usePage } from "../context";
import { kpiName, sourceName } from "../chartData";
import { ActionMenu, ChartState, PageHeader, Sr } from "../ui/blocks";
import { buildCsv, csvFileName, downloadCsv, type CsvMeta } from "../explore/csv";
import {
  applyPatch,
  defaultQuery,
  parseExplore,
  serialiseExplore,
  shapeOf,
  sourceOf,
  type Query,
  type QueryInput,
  type Shape,
  type SlotKey,
} from "../explore/exploreState";
import { fmtDate } from "../explore/indicatorInfo";
import { QueryBar, slotName } from "../explore/QueryBar";
import { layoutIssues } from "../explore/layout";
import { licenceOf, registerId, sampleNotice } from "../explore/sources";
import { Legend } from "../explore/ui";
import { MAX_FETCHES, buildView, fetchPlan, type ExploreView } from "../explore/view";
import "../explore/explore.css";

/** Chart types that grow with the card (ZChart fill); the others keep their natural height. */
const FILL_CHARTS = new Set<Query["chart"]>(["line", "columns", "scatter"]);

/** Example queries of the empty state (each opens a full view). */
function examples(lang: Lang): { label: string; to: string }[] {
  const pl = lang === "pl";
  const voiv = "PL02,PL04,PL06,PL08,PL10,PL12,PL14,PL16,PL18,PL20,PL22,PL24,PL26,PL28,PL30,PL32";
  return [
    {
      label: pl ? "Inflacja HICP: Polska i UE, ostatnie 10 lat" : "HICP inflation: Poland and the EU, last 10 years",
      to: "/explore?i=hicp_annual_rate&geo=PL,EU27,DE,CZ&t=10y&chart=line&series=geo&panels=",
    },
    {
      label: pl ? "Bezrobocie w województwach: ranking" : "Unemployment by voivodeship: ranking",
      to: `/explore?i=unemployment_lfs&lvl=woj&geo=${voiv}&t=1y&chart=bars&cats=geo&series=`,
    },
    {
      label: pl ? "Wynagrodzenie, PKB i ludność: indeks 2015 = 100" : "Wages, GDP and population: index 2015 = 100",
      to: "/explore?i=avg_wage,gdp_nominal,population_total&geo=PL&t=all&chart=line&series=i&panels=&cmp=index&base=2015",
    },
    {
      label: pl ? "Bezrobocie: wiek × płeć (mapa cieplna)" : "Unemployment: age × sex (heatmap)",
      to: "/explore?i=unemployment_lfs&geo=PL&t=5y&chart=heatmap&rows=age&cols=sex&m.sex=m,f&m.age=y15_24,y25_54,y55_64",
    },
  ];
}

export function ExplorePage() {
  const { lang, catalog, url } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Eksplorator danych" : "Data explorer";

  // The query is parsed from the URL once the catalogue is known, and again when the URL changes from outside
  // (back/forward, a saved view, a link from another page); edits replace the URL.
  const [q, setQ] = useState<Query | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  if (catalog && seen !== url.search) {
    setSeen(url.search);
    const next = parseExplore(url.search, catalog);
    if (!q || serialiseExplore(next) !== serialiseExplore(q)) setQ(next);
  }
  const qs = q ? serialiseExplore(q) : "";
  useEffect(() => {
    if (qs && window.location.pathname.startsWith("/explore") && window.location.search !== qs)
      window.history.replaceState(null, "", `/explore${qs}`);
  }, [qs]);
  useMeta(title, [{ label: title }], [lang, qs]);

  const shape = useMemo(() => (q && catalog ? shapeOf(q, catalog) : null), [q, catalog]);
  const result = useExploreData(catalog, q, shape, lang);
  const [views, setViews] = useState<SavedView[]>(() => loadViews(browserStorage()));
  const [status, setStatus] = useState("");

  if (!catalog || !q || !shape)
    return (
      <>
        <PageHeader title={title} />
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      </>
    );

  const patch = (p: Partial<QueryInput>) => setQ((cur) => (cur ? applyPatch(cur, p, catalog) : cur));
  const v = result.view;
  const csv = () => {
    if (!v) return;
    downloadCsv(csvFileName(q.i.length === 1 ? q.i[0]! : "eksplorator"), buildCsv(csvMeta(catalog, q, v, lang), v.csv));
  };
  const save = () => {
    const name = v ? `${v.caption}: ${v.title}` : title;
    setViews(saveView(browserStorage(), { name, url: `/explore${qs}` }));
    setStatus(pl ? "Zapisano widok w tej przeglądarce." : "View saved in this browser.");
  };
  const dirty = qs !== serialiseExplore(defaultQuery(catalog));

  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Porównaj wskaźniki w czasie i między obszarami; link zapisuje cały widok."
            : "Compare indicators over time and across areas; the link stores the whole view."
        }
        right={
          <>
            <button type="button" className="zt-btn" onClick={save} disabled={!v}>
              {pl ? "Zapisz widok" : "Save view"}
            </button>
            <button type="button" className="zt-btn zt-btn--primary" onClick={csv} disabled={!v || !!v.empty}>
              {pl ? "Pobierz CSV" : "Download CSV"}
            </button>
          </>
        }
      />
      <div className="xp-page">
        <QueryBar
          cat={catalog}
          q={q}
          shape={shape}
          lang={lang}
          onPatch={patch}
          dirty={dirty}
          onReset={() => setQ(defaultQuery(catalog))}
          views={views}
          onRemoveView={(id) => setViews(removeView(browserStorage(), id))}
        />
        {q.i.length ? (
          <Canvas cat={catalog} q={q} lang={lang} result={result} issue={issueText(q, shape, lang)} />
        ) : (
          <EmptyState lang={lang} />
        )}
        <p className="zt-sr" role="status">
          {status}
        </p>
      </div>
    </>
  );
}

/** First layout issue, named with its slot, for the canvas (the panel shows it on the slot itself). */
function issueText(q: Query, shape: Shape, lang: Lang): string | null {
  const [slot, text] = Object.entries(layoutIssues(q, shape))[0] ?? [];
  if (!slot || !text) return null;
  const pl = lang === "pl";
  return `${pl ? "Układ" : "Layout"} · ${slotName(slot as SlotKey, lang)}: ${pl ? text.pl : text.en} ${pl ? "(Wykres → Układ)" : "(Chart → Layout)"}`;
}

type ExploreData = { state: "loading" | "error" | "ready" | "too-big"; error?: string; view: ExploreView | null };

function useExploreData(cat: Catalog | undefined, q: Query | null, shape: Shape | null, lang: Lang): ExploreData {
  const plan = useMemo(() => (cat && q && shape ? fetchPlan(q, shape, cat) : []), [cat, q, shape]);
  const tooBig = plan.length > MAX_FETCHES;
  const key = plan.length && !tooBig ? JSON.stringify(plan) : null;
  const loaded = useData<Series[]>(key, async () => {
    const parts = await Promise.all(
      plan.map((f) => data.series(f.kpi, { geographies: f.geographies, sources: [f.source], members: f.members })),
    );
    return parts.flat();
  });
  return useMemo((): ExploreData => {
    if (!cat || !q || !shape || !q.i.length) return { state: "ready", view: null };
    if (tooBig) return { state: "too-big", view: null };
    if (loaded.error) return { state: "error", error: loaded.error, view: null };
    if (!loaded.data || loaded.loading) return { state: "loading", view: null };
    return { state: "ready", view: buildView(cat, q, shape, loaded.data, lang) };
  }, [cat, q, shape, loaded, lang, tooBig]);
}

function csvMeta(cat: Catalog, q: Query, v: ExploreView, lang: Lang): CsvMeta {
  const pl = lang === "pl";
  const lic = [...new Set(v.kpis.map((k) => licenceOf(cat, sourceOf(q, k))).filter((l) => !!l))];
  const meta: CsvMeta = [
    { label: pl ? "Tytuł" : "Title", value: v.title },
    { label: pl ? "Opis" : "Description", value: v.sub },
    { label: pl ? "Wskaźniki" : "Indicators", value: v.kpis.map((k) => `${kpiName(k, lang)} (${k.kpi_key})`).join("; ") },
    {
      label: pl ? "Źródło" : "Source",
      value: v.kpis.map((k) => `${sourceName(cat, sourceOf(q, k), lang)} (${registerId(cat, sourceOf(q, k))})`).join("; "),
    },
    { label: pl ? "Licencja" : "Licence", value: lic.map((l) => `${l.name} ${l.url}`).join("; ") || "–" },
  ];
  for (const n of v.notes) meta.push({ label: pl ? "Uwaga" : "Note", value: n });
  if (cat.sample) meta.push({ label: pl ? "Uwaga" : "Note", value: sampleNotice(lang) });
  meta.push({ label: pl ? "Wersja danych" : "Data version", value: cat.generated_at.slice(0, 10) });
  meta.push({ label: pl ? "Pobrano" : "Downloaded", value: new Date().toISOString().slice(0, 10) });
  meta.push({ label: "URL", value: window.location.href });
  return meta;
}

function Canvas({ cat, q, lang, result, issue }: { cat: Catalog; q: Query; lang: Lang; result: ExploreData; issue: string | null }) {
  const pl = lang === "pl";
  const v = result.view;
  const kpis = v?.kpis ?? [];
  const heading = v?.title ?? (pl ? "Wykres" : "Chart");
  const sources = [...new Set(kpis.map((k) => sourceOf(q, k)))];
  const body =
    result.state === "loading" ? (
      <ChartState state={{ kind: "loading" }} lang={lang} />
    ) : result.state === "error" ? (
      <ChartState state={{ kind: "error", text: result.error ?? "" }} lang={lang} />
    ) : result.state === "too-big" ? (
      <ChartState
        state={{
          kind: "empty",
          text: pl
            ? "To zapytanie wymaga zbyt wielu serii naraz. Wybierz mniej obszarów lub kategorii albo pokaż jedną wartość wymiaru (Wykres → Układ)."
            : "This query needs too many series at once. Choose fewer areas or categories, or show one value of a dimension (Chart → Layout).",
        }}
        lang={lang}
      />
    ) : v?.empty ? (
      <ChartState state={{ kind: "empty", text: v.empty }} lang={lang} />
    ) : v ? (
      v.grid ? (
        <div className="xp-grid">
          {v.panels.map((p) => (
            <figure key={p.key} className="xp-grid__cell">
              <figcaption className="xp-grid__title">{p.label}</figcaption>
              <ZChart {...p.chart} />
            </figure>
          ))}
        </div>
      ) : (
        <ZChart {...v.panels[0]!.chart} fill={FILL_CHARTS.has(q.chart)} />
      )
    ) : null;
  return (
    <section className="zt-card t-card xp-canvas" aria-labelledby="xp-chart-h">
      <div className="zt-card__head">
        <div className="t-card__titles">
          {v ? <p className="caption ex-muted ex-m0">{v.caption}</p> : null}
          <h2 className="zt-card__title" id="xp-chart-h">
            {heading}
          </h2>
          {v ? <p className="zt-card__sub">{v.sub}</p> : null}
        </div>
        <div className="t-card__tools">
          <ActionMenu
            label={(pl ? "Więcej akcji: " : "More actions: ") + heading}
            items={[
              {
                label: pl ? "Kopiuj link do widoku" : "Copy link to view",
                onSelect: () => void navigator.clipboard?.writeText(window.location.href).catch(() => undefined),
              },
              ...(kpis[0]
                ? ([
                    "sep",
                    {
                      label: pl ? `Strona wskaźnika: ${kpiName(kpis[0], lang)}` : `Indicator page: ${kpiName(kpis[0], lang)}`,
                      onSelect: () => navigate(`/kpi/${kpis[0]!.kpi_key}`),
                    },
                  ] as const)
                : []),
            ]}
          />
        </div>
      </div>
      {issue ? <p className="xp-issue xp-issue--canvas">{issue}</p> : null}
      <div
        className={`t-card__body xp-canvas__body${v && !v.grid && !v.empty && FILL_CHARTS.has(q.chart) ? " xp-canvas__body--fill" : ""}`}
        aria-busy={result.state === "loading" || undefined}
      >
        {body}
      </div>
      {v && !v.empty && v.legend ? <Legend chart={v.legend} /> : null}
      {v && v.notes.length ? (
        <ul className="xp-notes">
          {v.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      {v ? <Sr>{v.spoken}</Sr> : null}
      <p className="zt-sr" aria-live="polite">
        {v && !v.empty ? v.live : (v?.empty ?? "")}
      </p>
      <div className="zt-card__foot">
        <span>
          {pl ? "Źródło: " : "Source: "}
          {sources.map((s) => `${sourceName(cat, s, lang)} (${registerId(cat, s)})`).join(", ") || "–"}
          {" · "}
          {pl ? "licencja " : "licence "}
          {[...new Set(sources.map((s) => licenceOf(cat, s)?.name ?? "–"))].join(", ")}
        </span>
        <span>
          {pl ? "Dane z " : "Data as of "}
          {fmtDate(cat.generated_at, lang)}
          {cat.sample ? (pl ? " · dane przykładowe" : " · sample data") : ""}
        </span>
      </div>
    </section>
  );
}

function EmptyState({ lang }: { lang: Lang }) {
  const pl = lang === "pl";
  return (
    <section className="zt-card xp-empty" aria-labelledby="xp-empty-h">
      <h2 className="card-title ex-m0" id="xp-empty-h">
        {pl ? "Zacznij od wskaźnika" : "Start with an indicator"}
      </h2>
      <p className="ex-m0 ex-ink2">
        {pl
          ? "Wybierz wskaźnik przyciskiem „Wskaźniki” albo otwórz jeden z przykładów:"
          : "Choose an indicator with the “Indicators” button or open one of the examples:"}
      </p>
      <ul className="xp-examples">
        {examples(lang).map((e) => (
          <li key={e.to}>
            <Link to={e.to}>{e.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
