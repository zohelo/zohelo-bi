// Eksplorator danych v3 (design brief §4.2; Power BI field list + wells, OWID grapher card, Eurostat catalogue):
//   top     the ask box; an answer fills the wells visibly (the reader sees and can change what was chosen)
//   left    Pola: indicators grouped domain → group, dimensions, attributes (click, "+", keyboard menu or drag)
//   centre  Wizualizacja (chart picker by style family + recommendations) and wells (Wartości, the chart's slots,
//           Filtry), then the chart card: generated title and subtitle, the chart, panels or the matrix, legend,
//           notes, source; Kopiuj / Informacje on the card; CSV and XLSX in the page header (explorer only)
//   right   Katalog: the whole catalogue with nothing selected, definitions and related indicators when selected
// The URL holds the whole query, so a link, a refresh or Back reproduces the view.

import { useEffect, useMemo, useRef, useState } from "react";
import { rowsToXlsx } from "@zohelo/semantic";
import { ZChart } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data, type Catalog, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { browserStorage, loadViews, removeView, saveView, type SavedView } from "../../savedViews";
import { useMeta, usePage } from "../context";
import { kpiName, sourceName } from "../chartData";
import { ActionMenu, ChartState, InfoPopover, PageHeader, Sr } from "../ui/blocks";
import { KpiInfo } from "../ui/KpiInfo";
import { chartPng, copyImage, copyTable, legendFrom } from "../ui/copy";
import { buildCsv, buildXlsxRows, csvFileName, downloadCsv, downloadXlsx, type CsvMeta } from "../explore/csv";
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
import { SavedViewsPop, slotName } from "../explore/pops";
import { SideSearch } from "../shell/SideSearch";
import { AskResult } from "../ai/AskResult";
import { buildView as buildProposal, type ViewProposal } from "../ai/intent";
import { SLOTS, layoutIssues } from "../explore/layout";
import { licenceOf, registerId, sampleNotice } from "../explore/sources";
import { Legend } from "../explore/ui";
import { MAX_FETCHES, buildView, dimName, fetchPlan, type ExploreView } from "../explore/view";
import { FieldList, wellName } from "../explore/FieldList";
import { Wells } from "../explore/Wells";
import { CataloguePanel } from "../explore/CataloguePanel";
import { MatrixTable } from "../explore/MatrixTable";
import { kindLabel } from "../explore/kinds";
import type { Field } from "../explore/place";
import "../explore/explore.css";
import "../explore/explore3.css";

/** Chart types that grow with the card (ZChart fill); the others keep their natural height. */
const FILL_CHARTS = new Set<Query["chart"]>(["line", "columns", "scatter", "area", "stacked", "combo"]);

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
      label: pl ? "Bezrobocie w województwach: mapa" : "Unemployment by voivodeship: map",
      to: `/explore?i=unemployment_lfs&lvl=woj&geo=${voiv}&t=1y&chart=choro`,
    },
    {
      label: pl ? "Wynagrodzenie wobec roku poprzedniego (IBCS)" : "Wages against the previous year (IBCS)",
      to: "/explore?i=avg_wage&geo=PL&t=5y&chart=ibcs",
    },
    {
      label: pl ? "Bezrobocie: wiek × płeć (macierz)" : "Unemployment: age × sex (matrix)",
      to: "/explore?i=unemployment_lfs&geo=PL&t=5y&chart=matrix&rows=age&cols=sex&m.sex=m,f&m.age=y15_24,y25_54,y55_64",
    },
  ];
}

/** "Wartości: Inflacja CPI · Seria: Obszar · Wykres: Linia" — what the answer placed. */
function filledText(cat: Catalog, q: Query, lang: Lang): string {
  const pl = lang === "pl";
  const parts = [
    `${wellName("values", lang)}: ${q.i.map((k) => kpiName(cat.kpis.find((x) => x.kpi_key === k) ?? { name_pl: k, name_en: k }, lang)).join(", ")}`,
    ...SLOTS[q.chart].filter((s) => q.slots[s]).map((s) => `${slotName(s, lang)}: ${dimName(cat, q.slots[s]!, lang)}`),
    `${pl ? "Wykres" : "Chart"}: ${kindLabel(q.chart, lang)}`,
  ];
  return parts.join(" · ");
}

export function ExplorePage() {
  const { lang, catalog, url } = usePage();
  const pl = lang === "pl";
  const title = pl ? "Eksplorator danych" : "Data explorer";

  // The query is parsed from the URL once the catalogue is known, and again when the URL changes from outside
  // (back/forward, a saved view, a link from another page); edits replace the URL.
  const [q, setQ] = useState<Query | null>(null);
  const [seen, setSeen] = useState<string | null>(null);
  // ?ask=<words>: the view builder turns the request into a query (or points to another page).
  const [asked, setAsked] = useState<{ text: string; proposal: ViewProposal } | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<Field | null>(null);
  const [catOpen, setCatOpen] = useState(true);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  if (catalog && seen !== url.search) {
    setSeen(url.search);
    const ask = url.searchParams.get("ask")?.trim();
    let next: Query;
    if (ask) {
      const proposal = buildProposal(ask, catalog, lang);
      setAsked({ text: ask, proposal });
      next = parseExplore(proposal.kind === "explore" ? new URL(proposal.url, "https://x").search : "", catalog);
    } else next = parseExplore(url.search, catalog);
    if (!q || serialiseExplore(next) !== serialiseExplore(q)) setQ(next);
    // Open the tree where the chosen indicators are.
    const ks = next.i.map((k) => catalog.kpis.find((x) => x.kpi_key === k)).filter((k) => !!k);
    if (ks.length) setOpen(new Set([...open, ...ks.flatMap((k) => [k!.domain_key, k!.group_key])]));
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
  const stem = q.i.length === 1 ? q.i[0]! : "eksplorator";
  const csv = () => {
    if (!v) return;
    downloadCsv(csvFileName(stem), buildCsv(csvMeta(catalog, q, v, lang), v.csv));
  };
  const xlsx = () => {
    if (!v) return;
    downloadXlsx(csvFileName(stem), rowsToXlsx(buildXlsxRows(csvMeta(catalog, q, v, lang), v.csv), pl ? "Eksplorator" : "Explorer"));
  };
  const save = () => {
    const name = v ? `${v.caption}: ${v.title}` : title;
    setViews(saveView(browserStorage(), { name, url: `/explore${qs}` }));
    setStatus(pl ? "Zapisano widok w sekcji Dla Ciebie (w tej przeglądarce)." : "View saved to For you (in this browser).");
  };
  const dirty = qs !== serialiseExplore(defaultQuery(catalog));
  const openDomain = (key: string) => {
    setOpen(new Set([...open, key]));
    setFieldsOpen(true);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-node="${key}"]`)?.focus());
  };

  return (
    <>
      <PageHeader
        title={title}
        lead={
          pl
            ? "Zapytaj własnymi słowami albo zbuduj widok z pól: wskaźniki do wartości, wymiary na wykres lub do filtrów. Link zapisuje cały widok."
            : "Ask in your own words or build a view from fields: indicators to values, dimensions onto the chart or into filters. The link stores the whole view."
        }
        right={
          <>
            {views.length ? (
              <SavedViewsPop
                views={views}
                lang={lang}
                onRemove={(id) => setViews(removeView(browserStorage(), id))}
                closeLabel={pl ? "Zamknij" : "Close"}
              />
            ) : null}
            {dirty ? (
              <button type="button" className="zt-btn zt-btn--ghost" onClick={() => setQ(defaultQuery(catalog))}>
                {pl ? "Wyczyść" : "Clear"}
              </button>
            ) : null}
            <button type="button" className="zt-btn" onClick={save} disabled={!v}>
              {pl ? "Zapisz w Dla Ciebie" : "Save to For you"}
            </button>
            <button type="button" className="zt-btn" onClick={xlsx} disabled={!v || !!v.empty}>
              {pl ? "Pobierz XLSX" : "Download XLSX"}
            </button>
            <button type="button" className="zt-btn zt-btn--primary" onClick={csv} disabled={!v || !!v.empty}>
              {pl ? "Pobierz CSV" : "Download CSV"}
            </button>
          </>
        }
      />
      <div className="xp-page x3">
        <div className="xp-ask">
          <SideSearch lang={lang} catalog={catalog} compact={false} onPhoneOpen={() => undefined} hero />
        </div>
        {asked ? (
          <AskResult
            text={asked.text}
            proposal={asked.proposal}
            lang={lang}
            onClose={() => setAsked(null)}
            filled={q.i.length ? filledText(catalog, q, lang) : undefined}
          />
        ) : null}
        <div className={`x3-grid${catOpen ? "" : " x3-grid--nocat"}`}>
          <aside className={`x3-zone x3-zone--fields${fieldsOpen || !q.i.length ? " is-open" : ""}`} aria-labelledby="x3-fields-h">
            <div className="x3-zone__head">
              <h2 className="x3-zone__h" id="x3-fields-h">
                {pl ? "Pola" : "Fields"}
              </h2>
              <button
                type="button"
                className="zt-btn zt-btn--ghost x3-zone__toggle"
                aria-expanded={fieldsOpen || !q.i.length}
                onClick={() => setFieldsOpen(!fieldsOpen)}
              >
                {fieldsOpen || !q.i.length ? (pl ? "Ukryj pola" : "Hide fields") : pl ? "Pokaż pola" : "Show fields"}
              </button>
            </div>
            <div className="x3-zone__body">
              <FieldList cat={catalog} q={q} shape={shape} lang={lang} onPatch={patch} onDrag={setDragging} open={open} setOpen={setOpen} />
            </div>
          </aside>
          <div className="x3-zone x3-zone--main">
            <Wells cat={catalog} q={q} shape={shape} lang={lang} onPatch={patch} dragging={dragging} onDrag={setDragging} />
            {q.i.length ? (
              <Canvas cat={catalog} q={q} lang={lang} result={result} issue={issueText(q, shape, lang)} />
            ) : (
              <EmptyState lang={lang} />
            )}
          </div>
          <aside className="x3-zone x3-zone--cat" aria-labelledby="x3-cat-h">
            <div className="x3-zone__head">
              <h2 className="x3-zone__h" id="x3-cat-h">
                {pl ? "Katalog" : "Catalogue"}
              </h2>
              <button
                type="button"
                className="zt-btn zt-btn--ghost x3-zone__toggle"
                aria-expanded={catOpen}
                onClick={() => setCatOpen(!catOpen)}
              >
                {catOpen ? (pl ? "Zwiń katalog" : "Collapse catalogue") : pl ? "Pokaż katalog" : "Show catalogue"}
              </button>
            </div>
            {catOpen ? (
              <CataloguePanel cat={catalog} q={q} lang={lang} onOpenDomain={openDomain} onAdd={(k) => patch({ i: [...q.i, k] })} />
            ) : null}
          </aside>
        </div>
        <p className="zt-sr" role="status">
          {status}
        </p>
      </div>
    </>
  );
}

/** First layout issue, named with its slot, for the canvas (the well shows it on the slot itself). */
function issueText(q: Query, shape: Shape, lang: Lang): string | null {
  const [slot, text] = Object.entries(layoutIssues(q, shape))[0] ?? [];
  if (!slot || !text) return null;
  const pl = lang === "pl";
  return `${pl ? "Układ" : "Layout"} · ${slotName(slot as SlotKey, lang)}: ${pl ? text.pl : text.en}`;
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
  const canvasRef = useRef<HTMLElement>(null);
  const [said, setSaid] = useState("");
  const pl = lang === "pl";
  const v = result.view;
  const kpis = v?.kpis ?? [];
  const heading = v?.title ?? (pl ? "Wykres" : "Chart");
  const sources = [...new Set(kpis.map((k) => sourceOf(q, k)))];
  const fill = !!v && !v.grid && !v.empty && !v.matrix && FILL_CHARTS.has(q.chart);
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
            ? "To zapytanie wymaga zbyt wielu serii naraz. Wybierz mniej obszarów lub kategorii albo zdejmij wymiar z wykresu (zostanie filtrem)."
            : "This query needs too many series at once. Choose fewer areas or categories, or take a dimension off the chart (it becomes a filter).",
        }}
        lang={lang}
      />
    ) : v?.empty ? (
      <ChartState state={{ kind: "empty", text: v.empty }} lang={lang} />
    ) : v?.matrix ? (
      <>
        <MatrixTable m={v.matrix} caption={v.title} lang={lang} />
        <p className="caption x3-matrix__note">{v.matrix.note}</p>
      </>
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
        <ZChart {...v.panels[0]!.chart} fill={fill} />
      )
    ) : null;
  const copyImg = async () => {
    const svg = canvasRef.current?.querySelector<SVGSVGElement>("svg.zc-plot");
    if (!svg) return;
    const src = `${pl ? "Źródło" : "Source"}: ${sources.map((x) => sourceName(cat, x, lang)).join(", ")}${cat.sample ? (pl ? " · dane przykładowe" : " · sample data") : ""}`;
    try {
      const ok = await copyImage(await chartPng(svg, heading, src, legendFrom(canvasRef.current)));
      setSaid(ok ? (pl ? "Skopiowano wykres jako obraz" : "Chart copied as an image") : "");
    } catch {
      setSaid(pl ? "Przeglądarka nie pozwoliła skopiować" : "The browser did not allow copying");
    }
  };
  return (
    <section ref={canvasRef} className="zt-card t-card xp-canvas" aria-labelledby="xp-chart-h">
      <div className="zt-card__head">
        <div className="t-card__titles">
          {v ? <p className="caption ex-muted ex-m0">{v.caption}</p> : null}
          <h2 className="zt-card__title" id="xp-chart-h">
            {heading}
          </h2>
          {v ? <p className="zt-card__sub">{v.sub}</p> : null}
        </div>
        <div className="t-card__tools">
          {v && !v.empty ? (
            <ActionMenu
              label={(pl ? "Kopiuj: " : "Copy: ") + heading}
              icon="copy"
              items={[
                ...(v.matrix
                  ? []
                  : [
                      {
                        label: pl ? "Kopiuj jako obraz" : "Copy as image",
                        hint: pl ? "e-mail, Word, PowerPoint" : "email, Word, PowerPoint",
                        onSelect: () => void copyImg(),
                      },
                    ]),
                {
                  label: pl ? "Kopiuj dane jako tabelę" : "Copy data as a table",
                  hint: "Excel, Word, e-mail",
                  onSelect: () => void copyTable(heading, v.csv).then((ok) => setSaid(ok ? (pl ? "Skopiowano dane" : "Data copied") : "")),
                },
              ]}
            />
          ) : null}
          {kpis.length ? (
            <InfoPopover label={(pl ? "Informacje: " : "About: ") + heading} icon="info">
              {kpis.map((k) => (
                <KpiInfo key={k.kpi_key} kpi={k} cat={cat} lang={lang} />
              ))}
            </InfoPopover>
          ) : null}
        </div>
      </div>
      {issue ? <p className="xp-issue xp-issue--canvas">{issue}</p> : null}
      <div
        className={`t-card__body xp-canvas__body${fill ? " xp-canvas__body--fill" : ""}`}
        aria-busy={result.state === "loading" || undefined}
      >
        {body}
      </div>
      {v && !v.empty && v.legend && !v.matrix ? <Legend chart={v.legend} /> : null}
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
      <p className="zt-sr" role="status">
        {said}
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
          ? "Kliknij wskaźnik w polach po lewej, zapytaj w polu powyżej albo otwórz jeden z przykładów:"
          : "Click an indicator in the fields on the left, ask in the box above or open one of the examples:"}
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
