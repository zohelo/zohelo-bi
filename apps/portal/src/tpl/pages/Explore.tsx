// Eksplorator danych v4 (design brief §4.2; owner review 2026-11-05; Power BI field list + wells, OWID card):
//   top     page header (save, downloads on the right) and the ask box; an answer fills the wells visibly
//   left    Pola: Miary (measures by topic) and Wymiary (Kalendarz, Geografia, breakdowns — Analysis Services-style
//           dimension tables with levels), both collapsed at first
//   centre  Wizualizacja (every chart kind, grouped by style family) and wells named for the chart, then the chart
//           card: business title and subtitle, the finding, the chart / panels / matrix, legend, notes, source;
//           drill bar for hierarchies; Kopiuj menu (PNG, SVG, raw data, pivot, XLSX, CSV) on the card
//   right   Katalog: the whole catalogue with nothing selected, definitions and related measures when selected
// The explorer opens blank; the URL holds the whole query, so a link, a refresh or Back reproduces the view.
// mode=view shows the chart alone (saved views open this way) with "Edytuj widok" to return to the fields.
// On wide, tall screens the three zones fill the window below the ask box and scroll inside (one browser page).

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
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
import { Icon } from "../ui/icons";
import { KpiInfo } from "../ui/KpiInfo";
import { chartPlan, copyImage, copySvg, copyTable, downloadBlob, legendFrom, planPng, planSvg, tablePlan, type CardText } from "../ui/copy";
import { buildCsv, buildXlsxRows, csvFileName, downloadCsv, downloadXlsx, type CsvMeta } from "../explore/csv";
import {
  applyPatch,
  emptyQuery,
  normaliseQuery,
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
import { SavedViewsPop, slotName, type Patch } from "../explore/pops";
import { SideSearch } from "../shell/SideSearch";
import { AskResult } from "../ai/AskResult";
import { buildView as buildProposal, type ViewProposal } from "../ai/intent";
import { SLOTS, layoutIssues, missing, misuse } from "../explore/layout";
import { licenceOf, registerId, sampleNotice } from "../explore/sources";
import { Legend } from "../explore/ui";
import { MAX_FETCHES, buildView, dimName, fetchPlan, type ExploreView } from "../explore/view";
import { FieldList, wellName } from "../explore/FieldList";
import { DrillBar, Wells } from "../explore/Wells";
import { LookBar } from "../explore/LookBar";
import { CataloguePanel } from "../explore/CataloguePanel";
import { MatrixTable } from "../explore/MatrixTable";
import { kindLabel } from "../explore/kinds";
import type { Field } from "../explore/place";
import "../explore/explore.css";
import "../explore/explore3.css";

/** Chart kinds that grow with the card (ZChart fill); the others keep their natural height. */
const FILL_CHARTS = new Set<Query["chart"]>([
  "line",
  "columns",
  "area",
  "stacked",
  "stackcols",
  "share",
  "contributions",
  "combo",
  "bump",
  "scatter",
  "bubble",
  "ibcs",
  "variance",
  "boxplot",
]);

/** Example queries of the blank explorer (each opens a full view). */
function examples(lang: Lang): { label: string; to: string }[] {
  const pl = lang === "pl";
  const voiv = "PL02,PL04,PL06,PL08,PL10,PL12,PL14,PL16,PL18,PL20,PL22,PL24,PL26,PL28,PL30,PL32";
  return [
    {
      label: pl ? "Inflacja HICP: Polska i UE, ostatnie 10 lat" : "HICP inflation: Poland and the EU, last 10 years",
      to: "/explore?i=hicp_annual_rate&geo=PL,EU27,DE,CZ&t=10y&chart=line&x=t&leg=geo&sm=",
    },
    {
      label: pl ? "Bezrobocie w województwach: mapa" : "Unemployment by voivodeship: map",
      to: `/explore?i=unemployment_lfs&lvl=woj&geo=${voiv}&t=1y&chart=choro`,
    },
    {
      label: pl ? "Województwa: PKB, dochód i ludność (bąbelki)" : "Voivodeships: GDP, income and population (bubbles)",
      to: `/explore?i=gdp_per_capita_pps,disposable_income_pc,population_total&lvl=woj&geo=${voiv}&t=1y&chart=bubble&x=geo`,
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

/** "Wartości: Inflacja CPI · Oś X: Rok · Legenda: Kraj · Wykres: Linia" — what the answer placed. */
function filledText(cat: Catalog, q: Query, shape: Shape, lang: Lang): string {
  const pl = lang === "pl";
  const parts = [
    `${wellName("values", lang, q)}: ${q.i.map((k) => kpiName(cat.kpis.find((x) => x.kpi_key === k) ?? { name_pl: k, name_en: k }, lang)).join(", ")}`,
    ...SLOTS[q.chart]
      .filter((s) => q.slots[s])
      .map((s) => `${slotName(s, lang, q.chart)}: ${dimName(cat, q.slots[s]!, lang, { grain: shape.grain, level: q.level })}`),
    `${pl ? "Wykres" : "Chart"}: ${kindLabel(q.chart, lang)}`,
  ];
  return parts.join(" · ");
}

/** Whether a media query matches now (and on later changes). */
function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const change = () => setOn(mq.matches);
    mq.addEventListener("change", change);
    return () => mq.removeEventListener("change", change);
  }, [query]);
  return on;
}

/** Keeps `--x3-top` (the grid's distance from the top of the document) current, so the zones fill the window. */
function useFitTop(ref: RefObject<HTMLElement | null>, active: boolean) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const set = () => {
      const top = `${Math.round(el.getBoundingClientRect().top + window.scrollY)}px`;
      if (el.style.getPropertyValue("--x3-top") !== top) el.style.setProperty("--x3-top", top);
    };
    set();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(set);
    ro?.observe(document.body);
    window.addEventListener("resize", set);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", set);
    };
  }, [ref, active]);
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
  const gridRef = useRef<HTMLDivElement>(null);
  // Undo / redo (review 2026-11-09): serialised queries before and after each edit, and the last chart switch, so
  // switching back to the previous kind without other edits restores the selection the switch rewrote.
  const [past, setPast] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);
  const [lastSwitch, setLastSwitch] = useState<{ from: Query["chart"]; prev: string; to: string } | null>(null);
  const qRef = useRef<Query | null>(null);
  useEffect(() => {
    qRef.current = q;
  }, [q]);
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
    // Where the chosen measures are, the tree is open (the "Miary" section itself stays as the reader left it).
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
  const blank = useMemo(() => (catalog ? normaliseQuery(emptyQuery(), catalog) : null), [catalog]);
  const result = useExploreData(catalog, q, shape, lang);
  const [views, setViews] = useState<SavedView[]>(() => loadViews(browserStorage()));
  const [status, setStatus] = useState("");
  const viewMode = q?.mode === "view";
  useFitTop(gridRef, !!q && !viewMode);

  if (!catalog || !q || !shape || !blank)
    return (
      <>
        <PageHeader title={title} />
        <div className="zt-state" aria-busy="true">
          {pl ? "Wczytywanie" : "Loading"}
        </div>
      </>
    );

  /** Every edit goes through here, so it can be undone. */
  const commit = (next: Query, sw: typeof lastSwitch = null) => {
    const cur = qRef.current;
    if (!cur) return;
    const a = serialiseExplore(cur);
    if (a === serialiseExplore(next)) return;
    setPast((ps) => [...ps.slice(-49), a]);
    setFuture([]);
    setLastSwitch(sw);
    qRef.current = next;
    setQ(next);
  };
  const patch: Patch = (p: Partial<QueryInput>) => {
    const cur = qRef.current;
    if (!cur) return;
    const back = p.chart && lastSwitch && p.chart === lastSwitch.from && serialiseExplore(cur) === lastSwitch.to;
    const next = back ? parseExplore(lastSwitch.prev, catalog) : applyPatch(cur, p, catalog);
    const switched = !back && p.chart && p.chart !== cur.chart;
    commit(next, switched ? { from: cur.chart, prev: serialiseExplore(cur), to: serialiseExplore(next) } : null);
  };
  const undo = () => {
    const prev = past.at(-1);
    if (!prev) return;
    setFuture((f) => [qs, ...f]);
    setPast((ps) => ps.slice(0, -1));
    setLastSwitch(null);
    setQ(parseExplore(prev, catalog));
    setStatus(pl ? "Cofnięto ostatnią zmianę." : "Last change undone.");
  };
  const redo = () => {
    const next = future[0];
    if (!next) return;
    setPast((ps) => [...ps, qs]);
    setFuture((f) => f.slice(1));
    setLastSwitch(null);
    setQ(parseExplore(next, catalog));
    setStatus(pl ? "Przywrócono zmianę." : "Change redone.");
  };
  const v = result.view;
  const stem = q.i.length === 1 ? q.i[0]! : "eksplorator";
  const ready = !!v && !v.empty && !v.needs.length;
  const csv = () => {
    if (!v) return;
    downloadCsv(csvFileName(stem), buildCsv(csvMeta(catalog, q, v, lang), v.csv));
  };
  const xlsx = () => {
    if (!v) return;
    downloadXlsx(csvFileName(stem), rowsToXlsx(buildXlsxRows(csvMeta(catalog, q, v, lang), v.csv), pl ? "Eksplorator" : "Explorer"));
  };
  const save = () => {
    const name = v ? v.title : title;
    setViews(saveView(browserStorage(), { name, url: `/explore${serialiseExplore({ ...q, mode: "view" })}` }));
    setStatus(
      pl
        ? "Zapisano widok w sekcji Dla Ciebie (w tej przeglądarce); otworzy się jako sam wykres."
        : "View saved to For you (in this browser); it opens as the chart alone.",
    );
  };
  const dirty = qs !== serialiseExplore(blank);
  const openDomain = (key: string) => {
    setOpen(new Set([...open, "§m", key]));
    setFieldsOpen(true);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-node="${key}"]`)?.focus());
  };
  const downloads = (
    <>
      <button type="button" className="zt-btn" onClick={xlsx} disabled={!ready}>
        {pl ? "Pobierz XLSX" : "Download XLSX"}
      </button>
      <button type="button" className="zt-btn zt-btn--primary" onClick={csv} disabled={!ready}>
        {pl ? "Pobierz CSV" : "Download CSV"}
      </button>
    </>
  );
  const canvas = (
    <Canvas
      cat={catalog}
      q={q}
      shape={shape}
      lang={lang}
      result={result}
      issue={issueText(q, shape, lang)}
      onPatch={patch}
      onCsv={csv}
      onXlsx={xlsx}
      stem={stem}
    />
  );

  if (viewMode)
    return (
      <>
        <PageHeader
          title={title}
          right={
            <>
              <button type="button" className="zt-btn" onClick={() => patch({ mode: "edit" })}>
                {pl ? "Edytuj widok" : "Edit view"}
              </button>
              {downloads}
            </>
          }
        />
        <div className="xp-page x3 x3--view">{canvas}</div>
      </>
    );

  return (
    <>
      <PageHeader
        title={title}
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
            <UndoRedo lang={lang} canUndo={past.length > 0} canRedo={future.length > 0} onUndo={undo} onRedo={redo} />
            {dirty ? (
              <button type="button" className="zt-btn zt-btn--ghost" onClick={() => commit(blank)}>
                {pl ? "Wyczyść" : "Clear"}
              </button>
            ) : null}
            <button type="button" className="zt-btn" onClick={save} disabled={!ready}>
              {pl ? "Zapisz w Dla Ciebie" : "Save to For you"}
            </button>
            {downloads}
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
            filled={q.i.length ? filledText(catalog, q, shape, lang) : undefined}
          />
        ) : null}
        <div ref={gridRef} className={`x3-grid x3-grid--fit${catOpen ? "" : " x3-grid--nocat"}`}>
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
            <Wells
              key={asked ? `ask:${asked.text}` : "wells"}
              cat={catalog}
              q={q}
              shape={shape}
              lang={lang}
              onPatch={patch}
              dragging={dragging}
              onDrag={setDragging}
              asked={!!asked}
            />
            {canvas}
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
              <div className="x3-zone__body x3-zone__body--cat">
                <CataloguePanel cat={catalog} q={q} lang={lang} onOpenDomain={openDomain} onAdd={(k) => patch({ i: [...q.i, k] })} />
              </div>
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

/** Cofnij / Ponów buttons with Ctrl+Z, Ctrl+Shift+Z and Ctrl+Y (not while typing in a field). */
function UndoRedo({
  lang,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  lang: Lang;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const pl = lang === "pl";
  const keys = useRef({ onUndo, onRedo });
  useEffect(() => {
    keys.current = { onUndo, onRedo };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) keys.current.onUndo();
      else if ((k === "z" && e.shiftKey) || k === "y") keys.current.onRedo();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <span className="x3-undo" role="group" aria-label={pl ? "Historia zmian" : "Edit history"}>
      <button
        type="button"
        className="zt-btn zt-btn--ghost x3-undo__btn"
        onClick={onUndo}
        disabled={!canUndo}
        aria-keyshortcuts="Control+Z"
        title={pl ? "Cofnij (Ctrl+Z)" : "Undo (Ctrl+Z)"}
      >
        <Icon name="undo" size={16} />
        <Sr>{pl ? "Cofnij" : "Undo"}</Sr>
      </button>
      <button
        type="button"
        className="zt-btn zt-btn--ghost x3-undo__btn"
        onClick={onRedo}
        disabled={!canRedo}
        aria-keyshortcuts="Control+Shift+Z"
        title={pl ? "Ponów (Ctrl+Shift+Z)" : "Redo (Ctrl+Shift+Z)"}
      >
        <Icon name="redo" size={16} />
        <Sr>{pl ? "Ponów" : "Redo"}</Sr>
      </button>
    </span>
  );
}

/** First layout issue, named with its well, for the canvas (the well shows it on itself). */
function issueText(q: Query, shape: Shape, lang: Lang): string | null {
  const [slot, text] = Object.entries(layoutIssues(q, shape))[0] ?? [];
  if (!slot || !text) return null;
  const pl = lang === "pl";
  const where = slot === "values" ? wellName("values", lang, q) : slotName(slot as SlotKey, lang, q.chart);
  return `${pl ? "Układ" : "Layout"} · ${where}: ${pl ? text.pl : text.en}`;
}

type ExploreData = { state: "loading" | "error" | "ready" | "too-big"; error?: string; view: ExploreView | null };

function useExploreData(cat: Catalog | undefined, q: Query | null, shape: Shape | null, lang: Lang): ExploreData {
  const plan = useMemo(() => (cat && q && shape && !missing(q.chart, q).length ? fetchPlan(q, shape, cat) : []), [cat, q, shape]);
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
    if (missing(q.chart, q).length) return { state: "ready", view: buildView(cat, q, shape, [], lang) };
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
    { label: pl ? "Miary" : "Measures", value: v.kpis.map((k) => `${kpiName(k, lang)} (${k.kpi_key})`).join("; ") },
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

/** What the blank explorer or an incomplete chart still needs, with examples when nothing is chosen yet. */
function NeedsState({ q, lang, needs }: { q: Query; lang: Lang; needs: { pl: string; en: string }[] }) {
  const pl = lang === "pl";
  return (
    <div className="x3-needs">
      <p className="x3-needs__h">
        {q.i.length
          ? pl
            ? `${kindLabel(q.chart, lang)}: uzupełnij studzienki`
            : `${kindLabel(q.chart, lang)}: fill the wells`
          : pl
            ? "Pusty widok"
            : "Blank view"}
      </p>
      <ul className="x3-needs__list">
        {needs.map((n) => (
          <li key={n.pl}>{pl ? `Dodaj ${n.pl}.` : `Add ${n.en}.`}</li>
        ))}
      </ul>
      <p className="x3-needs__how">
        {pl
          ? "Otwórz „Miary” lub „Wymiary” w panelu „Pola” i kliknij „+”, przeciągnij pole na studzienkę albo zapytaj w polu powyżej. Link zapisuje cały widok."
          : "Open “Measures” or “Dimensions” in the Fields panel and click “+”, drag a field onto a well, or ask in the box above. The link stores the whole view."}
      </p>
      {!q.i.length ? (
        <>
          <p className="x3-needs__how">{pl ? "Albo otwórz przykład:" : "Or open an example:"}</p>
          <ul className="xp-examples">
            {examples(lang).map((e) => (
              <li key={e.to}>
                <Link to={e.to}>{e.label}</Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

type CanvasProps = {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  result: ExploreData;
  issue: string | null;
  onPatch: Patch;
  onCsv: () => void;
  onXlsx: () => void;
  stem: string;
};

function Canvas({ cat, q, shape, lang, result, issue, onPatch, onCsv, onXlsx, stem }: CanvasProps) {
  const canvasRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [said, setSaid] = useState("");
  const pl = lang === "pl";
  const v = result.view;
  const kpis = v?.kpis ?? [];
  const needs = q.i.length ? (v?.needs ?? []) : missing(q.chart, q);
  const heading = q.i.length ? (v?.title ?? (pl ? "Wykres" : "Chart")) : pl ? "Nowy widok" : "New view";
  const sources = [...new Set(kpis.map((k) => sourceOf(q, k)))];
  const ready = !!v && !v.empty && !needs.length && !Object.keys(misuse(q, shape)).length;
  const fill = ready && !v.grid && !v.matrix && FILL_CHARTS.has(q.chart);
  // In the one-page layout a growing chart starts small and takes whatever height the window leaves.
  const fitWindow = useMedia("(min-width: 1336px) and (min-height: 680px)");
  const sourceLine = `${pl ? "Źródło" : "Source"}: ${sources.map((s) => `${sourceName(cat, s, lang)} (${registerId(cat, s)})`).join(", ") || "–"} · ${
    pl ? "licencja" : "licence"
  } ${[...new Set(sources.map((s) => licenceOf(cat, s)?.name ?? "–"))].join(", ")} · ${pl ? "dane z" : "data as of"} ${fmtDate(cat.generated_at, lang)}${
    cat.sample ? (pl ? " · dane przykładowe" : " · sample data") : ""
  }`;
  const wrong = needs.length ? undefined : Object.values(misuse(q, shape))[0];
  const body = needs.length ? (
    <NeedsState q={q} lang={lang} needs={needs} />
  ) : wrong ? (
    <ChartState state={{ kind: "empty", text: pl ? wrong.pl : wrong.en }} lang={lang} />
  ) : result.state === "loading" ? (
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
      <ZChart
        {...v.panels[0]!.chart}
        fill={fill}
        height={fill && fitWindow ? Math.min(v.panels[0]!.chart.height ?? 240, 200) : v.panels[0]!.chart.height}
      />
    )
  ) : null;

  const text = (): CardText => ({
    title: heading,
    sub: v?.sub,
    finding: v?.finding || undefined,
    source: sourceLine,
    legend: v?.matrix ? [] : legendFrom(canvasRef.current),
  });
  const plan = () => {
    if (!v) return null;
    if (v.matrix) {
      const m = v.matrix;
      return tablePlan(text(), {
        columns: [m.colHead ? `${m.rowHead} \\ ${m.colHead}` : m.rowHead, ...m.cols.map((c) => c.label)],
        rows: m.rows.map((r, i) => [r.label, ...m.cells[i]!]),
        numeric: [false, ...m.cols.map(() => true)],
      });
    }
    return bodyRef.current ? chartPlan(bodyRef.current, text()) : null;
  };
  const tell = (s: string) => setSaid(s);
  const copyPng = async () => {
    const p = plan();
    if (!p) return;
    try {
      const png = await planPng(p);
      if (await copyImage(png))
        tell(pl ? "Skopiowano obraz: wykres z tytułem, legendą i źródłem" : "Image copied: chart with title, legend and source");
      else {
        downloadBlob(`${stem}.png`, png);
        tell(
          pl
            ? "Przeglądarka nie pozwoliła skopiować obrazu: pobrano plik PNG"
            : "The browser did not allow copying the image: PNG downloaded",
        );
      }
    } catch {
      tell(pl ? "Nie udało się przygotować obrazu" : "Could not prepare the image");
    }
  };
  const copyVector = async () => {
    const p = plan();
    if (!p) return;
    const r = await copySvg(planSvg(p), `${stem}.svg`);
    tell(
      r === "copied"
        ? pl
          ? "Skopiowano grafikę wektorową (SVG)"
          : "Vector graphic (SVG) copied"
        : pl
          ? "Pobrano plik SVG"
          : "SVG file downloaded",
    );
  };
  const extra = () => ({ sub: v?.sub, foot: [sourceLine, ...(v?.notes ?? [])], comma: pl });
  const copyRaw = () =>
    v && void copyTable(heading, v.csv, extra()).then((ok) => tell(ok ? (pl ? "Skopiowano dane surowe" : "Raw data copied") : ""));
  const copyPivot = () =>
    v &&
    void copyTable(heading, v.pivot, extra()).then((ok) => tell(ok ? (pl ? "Skopiowano tabelę przestawną" : "Pivot table copied") : ""));

  return (
    <section ref={canvasRef} className="zt-card t-card xp-canvas" aria-labelledby="xp-chart-h">
      <div className="zt-card__head">
        <div className="t-card__titles">
          <h2 className="zt-card__title" id="xp-chart-h">
            {heading}
          </h2>
          {v && ready ? <p className="zt-card__sub">{v.sub}</p> : null}
          {v && ready && v.finding ? <p className="x3-finding">{v.finding}</p> : null}
        </div>
        <div className="t-card__tools">
          {ready ? (
            <ActionMenu
              label={(pl ? "Kopiuj i pobierz: " : "Copy and download: ") + heading}
              icon="copy"
              items={[
                {
                  label: pl ? "Kopiuj jako obraz (PNG)" : "Copy as image (PNG)",
                  hint: pl ? "z tytułem, legendą i źródłem" : "with title, legend and source",
                  onSelect: () => void copyPng(),
                },
                {
                  label: pl ? "Kopiuj jako wektor (SVG)" : "Copy as vector (SVG)",
                  hint: pl ? "PowerPoint, Illustrator; inaczej pobiera plik" : "PowerPoint, Illustrator; else downloads a file",
                  onSelect: () => void copyVector(),
                },
                "sep",
                {
                  label: pl ? "Kopiuj dane surowe" : "Copy raw data",
                  hint: pl ? "każda obserwacja: Excel, Word" : "every observation: Excel, Word",
                  onSelect: () => copyRaw(),
                },
                {
                  label: pl ? "Kopiuj tabelę przestawną" : "Copy pivot table",
                  hint: pl ? "kategorie w wierszach, serie w kolumnach" : "categories in rows, series in columns",
                  onSelect: () => copyPivot(),
                },
                "sep",
                { label: pl ? "Pobierz XLSX (dane surowe)" : "Download XLSX (raw data)", onSelect: onXlsx },
                { label: pl ? "Pobierz CSV (dane surowe)" : "Download CSV (raw data)", onSelect: onCsv },
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
      <DrillBar cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />
      {ready ? (
        <LookBar q={q} lang={lang} onPatch={onPatch} rates={shape.kpis.some((k) => /^(pct|pp|rate|per_)/.test(k.unit_key))} />
      ) : null}
      {issue && !needs.length && !wrong ? <p className="xp-issue xp-issue--canvas">{issue}</p> : null}
      <div
        ref={bodyRef}
        className={`t-card__body xp-canvas__body${fill ? " xp-canvas__body--fill" : ""}`}
        aria-busy={result.state === "loading" || undefined}
      >
        {body}
      </div>
      {ready && v.legend && !v.matrix ? <Legend chart={v.legend} /> : null}
      {v && ready && v.notes.length ? (
        <ul className="xp-notes">
          {v.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
      {v && ready ? <Sr>{v.spoken}</Sr> : null}
      <p className="zt-sr" aria-live="polite">
        {v && ready ? v.live : (v?.empty ?? "")}
      </p>
      <p className="zt-sr" role="status">
        {said}
      </p>
      {q.i.length ? (
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
      ) : null}
    </section>
  );
}
