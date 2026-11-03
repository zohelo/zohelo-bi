// Eksplorator danych (design template: Explorer page type). Query panel on the left (four numbered steps;
// stacks above the canvas below 1024px and folds behind "Edytuj zapytanie" on phones), canvas on the right:
// applied-state bar, generated title and subtitle, the chart (one, or panels), legend, notes and source.
// The URL holds the whole query, so a link, a refresh or Back reproduces the view.

import { useEffect, useMemo, useState } from "react";
import { useData } from "../../components/useData";
import { data, type Catalog, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { Link, navigate } from "../../router";
import { browserStorage, loadViews, removeView, saveView, type SavedView } from "../../savedViews";
import { ZChart } from "@zohelo/visuals";
import { useMeta, usePage } from "../context";
import { geoName, kpiName, sourceName } from "../chartData";
import { ActionMenu, ChartState, PageHeader, Sr } from "../ui/blocks";
import { Icon } from "../ui/icons";
import { buildCsv, csvFileName, downloadCsv, type CsvMeta } from "../explore/csv";
import {
  applyPatch,
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
import { QueryPanel, slotName } from "../explore/QueryPanel";
import { layoutIssues } from "../explore/layout";
import { plural } from "../explore/search";
import { licenceOf, registerId, sampleNotice } from "../explore/sources";
import { Legend } from "../explore/ui";
import { MAX_FETCHES, buildView, dimName, fetchPlan, memberLabel, type ExploreView } from "../explore/view";
import "../explore/explore.css";

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
  const [panelOpen, setPanelOpen] = useState(false);

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
  const applied = appliedChips(catalog, q, shape, lang, patch);

  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Wybierz wskaźniki, obszary i okres, potem ułóż wymiary i typ wykresu. Link zapisuje cały widok."
            : "Choose indicators, areas and a period, then arrange the dimensions and the chart type. The link stores the whole view."
        }
        right={
          <button type="button" className="zt-btn zt-btn--primary" onClick={csv} disabled={!v || !!v.empty}>
            {pl ? "Pobierz CSV" : "Download CSV"}
          </button>
        }
      />
      <div className="xp-layout">
        <div className="xp-side" data-open={panelOpen}>
          <button
            type="button"
            className="zt-btn xp-toggle"
            aria-expanded={panelOpen}
            aria-controls="xp-query"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            <span>
              {pl ? "Edytuj zapytanie" : "Edit query"} ({applied.length})
            </span>
            <Icon name="chevronDown" size={16} />
          </button>
          <section className="zt-card xp-panel" id="xp-query" aria-labelledby="xp-query-h">
            <h2 className="card-title ex-m0" id="xp-query-h">
              {pl ? "Zapytanie" : "Query"}
            </h2>
            <QueryPanel cat={catalog} q={q} shape={shape} lang={lang} onPatch={patch} />
          </section>
          <SavedViews views={views} lang={lang} onRemove={(id) => setViews(removeView(browserStorage(), id))} />
        </div>
        <div className="xp-main">
          {q.i.length ? (
            <>
              <div className="xp-applied" role="group" aria-label={pl ? "Zastosowane wybory" : "Applied choices"}>
                <ul className="xp-chips">
                  {applied.map((c) => (
                    <li key={c.key} className="zt-chip xp-chip xp-chip--applied">
                      <span className="xp-chip__k">{c.kind}:</span> {c.label}
                      {c.remove ? (
                        <button type="button" aria-label={(pl ? "Usuń: " : "Remove: ") + `${c.kind} ${c.label}`} onClick={c.remove}>
                          ×
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <button type="button" className="zt-btn zt-btn--ghost xp-btn-sm" onClick={() => patch({ i: [] })}>
                  {pl ? "Wyczyść wszystko" : "Clear all"}
                </button>
              </div>
              <Canvas cat={catalog} q={q} lang={lang} result={result} issue={issueText(q, shape, lang)} onCsv={csv} onSave={save} />
            </>
          ) : (
            <EmptyState lang={lang} />
          )}
          <p className="zt-sr" role="status">
            {status}
          </p>
        </div>
      </div>
    </>
  );
}

/** First layout issue, named with its slot, for the canvas (the panel shows it on the slot itself). */
function issueText(q: Query, shape: Shape, lang: Lang): string | null {
  const [slot, text] = Object.entries(layoutIssues(q, shape))[0] ?? [];
  if (!slot || !text) return null;
  const pl = lang === "pl";
  return `${pl ? "Układ" : "Layout"} · ${slotName(slot as SlotKey, lang)}: ${pl ? text.pl : text.en} ${pl ? "(krok 4)" : "(step 4)"}`;
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

type Chip = { key: string; kind: string; label: string; remove?: () => void };

function appliedChips(cat: Catalog, q: Query, shape: Shape, lang: Lang, patch: (p: Partial<QueryInput>) => void): Chip[] {
  const pl = lang === "pl";
  const out: Chip[] = [];
  for (const k of shape.kpis)
    out.push({
      key: `i-${k.kpi_key}`,
      kind: pl ? "Wskaźnik" : "Indicator",
      label: kpiName(k, lang),
      remove: () => patch({ i: q.i.filter((x) => x !== k.kpi_key) }),
    });
  if (q.geo.length > 4)
    out.push({
      key: "g-all",
      kind: pl ? "Obszar" : "Area",
      label: `${q.geo.length} ${plural(q.geo.length, lang, ["obszar", "obszary", "obszarów"], ["area", "areas"])}`,
      remove: () => patch({ geo: q.geo.slice(0, 1) }),
    });
  else
    for (const g of q.geo)
      out.push({
        key: `g-${g}`,
        kind: pl ? "Obszar" : "Area",
        label: geoName(cat, g, lang),
        remove: q.geo.length > 1 ? () => patch({ geo: q.geo.filter((x) => x !== g) }) : undefined,
      });
  for (const [d, ms] of Object.entries(q.members))
    for (const m of ms)
      out.push({
        key: `m-${d}-${m}`,
        kind: dimName(cat, d, lang),
        label: memberLabel(cat, d, m, lang),
        remove: () => patch({ members: { ...q.members, [d]: ms.filter((x) => x !== m) } }),
      });
  const def = "last" in q.time && q.time.last === 10;
  out.push({
    key: "t",
    kind: pl ? "Okres" : "Period",
    label: shape.window[0] === shape.window[1] ? String(shape.window[0]) : `${shape.window[0]}–${shape.window[1]}`,
    remove: def ? undefined : () => patch({ time: { last: 10 } }),
  });
  for (const [d, m] of Object.entries(q.filters))
    out.push({
      key: `f-${d}`,
      kind: `${dimName(cat, d, lang)} (${pl ? "filtr" : "filter"})`,
      label: memberLabel(cat, d, m, lang),
      remove: () => {
        const f = { ...q.filters };
        delete f[d];
        patch({ filters: f });
      },
    });
  return out;
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

function Canvas({
  cat,
  q,
  lang,
  result,
  issue,
  onCsv,
  onSave,
}: {
  cat: Catalog;
  q: Query;
  lang: Lang;
  result: ExploreData;
  issue: string | null;
  onCsv: () => void;
  onSave: () => void;
}) {
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
            ? "To zapytanie wymaga zbyt wielu serii naraz. Zmniejsz liczbę kategorii w kroku 2 albo przenieś wymiar do filtra."
            : "This query needs too many series at once. Select fewer categories in step 2 or move a dimension to a filter.",
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
        <ZChart {...v.panels[0]!.chart} />
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
          <button type="button" className="zt-btn" onClick={onSave} disabled={!v}>
            {pl ? "Zapisz widok" : "Save view"}
          </button>
          <ActionMenu
            label={(pl ? "Więcej akcji: " : "More actions: ") + heading}
            items={[
              { label: pl ? "Pobierz CSV (widoczne dane)" : "Download CSV (visible data)", onSelect: onCsv },
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
      <div className="t-card__body xp-canvas__body" aria-busy={result.state === "loading" || undefined}>
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
          ? "Wyszukaj wskaźnik w kroku 1 albo otwórz jeden z przykładów:"
          : "Search for an indicator in step 1 or open one of the examples:"}
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

function SavedViews({ views, lang, onRemove }: { views: SavedView[]; lang: Lang; onRemove: (id: string) => void }) {
  const pl = lang === "pl";
  if (!views.length) return null;
  return (
    <section className="zt-card xp-saved" aria-labelledby="xp-saved-h">
      <h2 className="card-title ex-m0" id="xp-saved-h">
        {pl ? "Zapisane widoki" : "Saved views"} <span className="small ex-muted">({views.length})</span>
      </h2>
      <p className="caption ex-muted ex-m0">{pl ? "Zapisane w tej przeglądarce." : "Stored in this browser."}</p>
      <ul className="xp-saved__list">
        {views.slice(0, 8).map((s) => (
          <li key={s.id}>
            <Link to={s.url} className="small">
              {s.name}
            </Link>
            <button
              type="button"
              className="xp-icon"
              aria-label={(pl ? "Usuń widok: " : "Remove view: ") + s.name}
              onClick={() => onRemove(s.id)}
            >
              <Icon name="close" size={14} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
