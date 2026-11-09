// Collections (docs/product-principles.md, needs 3 and 4; owner: "not another Power BI"). One concept instead of a
// dashboard builder and a presentation builder: views pinned from the explorer into a named collection, in an order
// the reader sets, each with a title and a comment. The same collection reads as a board (all views) or as slides
// (one at a time), and goes out as one PowerPoint file: native charts where Office has the type, vector pictures
// elsewhere. There is no grid editor on purpose: order, title and comment are the whole model.
//   /kolekcje        the reader's collections
//   /kolekcje/<id>   one collection; ?widok=slajdy opens it as slides

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ZChart } from "@zohelo/visuals";
import {
  addItem,
  createCollection,
  loadCollections,
  moveItem,
  removeCollection,
  removeItem,
  renameCollection,
  updateItem,
  type Collection,
  type CollectionItem,
} from "../../collections";
import type { Catalog } from "../../data";
import type { Lang } from "../../i18n";
import { Link, navigate } from "../../router";
import { browserStorage, loadViews } from "../../savedViews";
import { useMeta, usePage } from "../context";
import { MatrixTable } from "../explore/MatrixTable";
import { deckTheme, downloadDeck, isNative, viewSlide } from "../explore/exportView";
import { parseExplore, shapeOf } from "../explore/exploreState";
import { Legend } from "../explore/ui";
import { sourceLineOf, useExploreData } from "../explore/useExploreData";
import { ChartState, PageHeader, Segmented, Sr } from "../ui/blocks";
import { chartPlan, legendFrom, planSvg, tablePlan } from "../ui/copy";
import { Icon } from "../ui/icons";
import type { SlideSpec } from "../ui/pptx";
import "./collection.css";

type Mode = "board" | "slides";
type Exporter = () => SlideSpec | null;

const store = () => browserStorage();

export function CollectionsPage({ id }: { id: string | null }) {
  const { lang, catalog } = usePage();
  const pl = lang === "pl";
  const [list, setList] = useState<Collection[]>(() => loadCollections(store()));
  const current = id ? list.find((c) => c.id === id) : undefined;
  const title = current ? current.name : pl ? "Kolekcje" : "Collections";
  useMeta(title, current ? [{ label: pl ? "Kolekcje" : "Collections", to: "/kolekcje" }, { label: current.name }] : [{ label: title }], [
    lang,
    id,
    title,
  ]);
  if (id && !current)
    return (
      <>
        <PageHeader title={pl ? "Nie ma takiej kolekcji" : "No such collection"} />
        <p className="body">
          {pl
            ? "Kolekcje są zapisane w tej przeglądarce. Ta mogła zostać usunięta albo powstała na innym urządzeniu. "
            : "Collections are kept in this browser. This one may have been removed, or made on another device. "}
          <Link to="/kolekcje">{pl ? "Zobacz swoje kolekcje" : "See your collections"}</Link>
        </p>
      </>
    );
  return current ? (
    <CollectionView c={current} cat={catalog} lang={lang} onList={setList} />
  ) : (
    <CollectionList list={list} lang={lang} onList={setList} />
  );
}

// ---------- the list

function CollectionList({ list, lang, onList }: { list: Collection[]; lang: Lang; onList: (l: Collection[]) => void }) {
  const pl = lang === "pl";
  const create = () => {
    const { created } = createCollection(store(), pl ? `Kolekcja ${list.length + 1}` : `Collection ${list.length + 1}`);
    navigate(`/kolekcje/${created.id}`);
  };
  return (
    <>
      <PageHeader
        title={pl ? "Kolekcje" : "Collections"}
        lead={
          pl
            ? "Zbierz swoje wykresy w jednym miejscu: ułóż je w kolejności, dodaj tytuły i komentarze, oglądaj jako tablicę albo slajdy i pobierz całość jako plik PowerPoint."
            : "Gather your charts in one place: put them in order, add titles and comments, view them as a board or as slides, and download the lot as one PowerPoint file."
        }
        right={
          <button type="button" className="zt-btn zt-btn--primary" onClick={create}>
            {pl ? "Nowa kolekcja" : "New collection"}
          </button>
        }
      />
      {list.length ? (
        <ul className="kc-list">
          {list.map((c) => (
            <li key={c.id} className="zt-card kc-list__item">
              <Link to={`/kolekcje/${c.id}`} className="kc-list__name">
                {c.name}
              </Link>
              <span className="small kc-list__meta">
                {pl ? `${c.items.length} ${plural(c.items.length)}` : `${c.items.length} ${c.items.length === 1 ? "view" : "views"}`} ·{" "}
                {pl ? "zmieniono " : "changed "}
                {new Date(c.updated_at).toLocaleDateString(pl ? "pl-PL" : "en-GB")}
              </span>
              <button
                type="button"
                className="zt-btn zt-btn--ghost kc-list__remove"
                onClick={() => {
                  if (
                    window.confirm(
                      pl ? `Usunąć kolekcję „${c.name}”? Zapisane widoki zostaną.` : `Remove the collection “${c.name}”? Saved views stay.`,
                    )
                  )
                    onList(removeCollection(store(), c.id));
                }}
              >
                {pl ? "Usuń" : "Remove"}
                <Sr>: {c.name}</Sr>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="zt-card kc-empty">
          <h2 className="card-title">{pl ? "Nie masz jeszcze kolekcji" : "You have no collections yet"}</h2>
          <p className="body">
            {pl
              ? "Otwórz wykres w eksploratorze i wybierz „Zapisz”, potem „Dodaj do kolekcji”. Możesz też zacząć od pustej kolekcji i dodać do niej zapisane widoki."
              : "Open a chart in the explorer and choose “Save”, then “Add to collection”. Or start with an empty collection and add your saved views to it."}
          </p>
          <p className="kc-empty__go">
            <Link to="/explore" className="zt-btn">
              {pl ? "Otwórz eksplorator" : "Open the explorer"}
            </Link>
            <button type="button" className="zt-btn zt-btn--primary" onClick={create}>
              {pl ? "Nowa kolekcja" : "New collection"}
            </button>
          </p>
        </div>
      )}
    </>
  );
}

/** Polish plural: 1 slajd, 2 slajdy, 5 slajdów. */
const few = (n: number, one: string, some: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? some : many;
const plural = (n: number) => few(n, "widok", "widoki", "widoków");

// ---------- one collection

function CollectionView({
  c,
  cat,
  lang,
  onList,
}: {
  c: Collection;
  cat: Catalog | undefined;
  lang: Lang;
  onList: (l: Collection[]) => void;
}) {
  const pl = lang === "pl";
  const { url } = usePage();
  const [mode, setMode] = useState<Mode>(() => (url.searchParams.get("widok") === "slajdy" ? "slides" : "board"));
  const [at, setAt] = useState(0);
  const [said, setSaid] = useState("");
  const [busy, setBusy] = useState(false);
  const exporters = useRef(new Map<string, Exporter>());
  const [ready, setReady] = useState(0);
  const register = useCallback((id: string, fn: Exporter | null) => {
    if (fn) exporters.current.set(id, fn);
    else exporters.current.delete(id);
    setReady(exporters.current.size);
  }, []);
  const n = c.items.length;
  const cur = Math.min(at, Math.max(0, n - 1));
  const go = useCallback((d: number) => setAt((i) => Math.min(Math.max(0, n - 1), Math.max(0, Math.min(i, n - 1) + d))), [n]);
  // Slides: the arrow keys turn the pages, unless the reader is typing.
  useEffect(() => {
    if (mode !== "slides") return;
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "PageUp") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [mode, go]);
  const setModeUrl = (m: Mode) => {
    setMode(m);
    const next = new URL(window.location.href);
    if (m === "slides") next.searchParams.set("widok", "slajdy");
    else next.searchParams.delete("widok");
    window.history.replaceState(null, "", next.pathname + next.search);
  };
  const saved = useMemo(() => loadViews(store()).filter((v) => !c.items.some((i) => i.url === v.url)), [c.items]);
  const exportAll = async () => {
    setBusy(true);
    setSaid(pl ? "Przygotowuję plik PowerPoint…" : "Preparing the PowerPoint file…");
    try {
      const slides = c.items.map((i) => exporters.current.get(i.id)?.() ?? null).filter((s): s is SlideSpec => !!s);
      if (!slides.length) {
        setSaid(pl ? "Nie ma jeszcze czego pobrać: wykresy się ładują." : "Nothing to download yet: the charts are loading.");
        return;
      }
      const theme = deckTheme();
      await downloadDeck(fileStem(c.name), slides, c.name, theme);
      const native = slides.filter((s) => s.native).length;
      const skipped = n - slides.length;
      setSaid(
        pl
          ? `Pobrano ${slides.length} ${few(slides.length, "slajd", "slajdy", "slajdów")}: ${native} z edytowalnym wykresem PowerPointa, ${slides.length - native} jako grafika wektorowa.${skipped ? ` Pominięto ${skipped} (bez danych).` : ""}`
          : `Downloaded ${slides.length} ${slides.length === 1 ? "slide" : "slides"}: ${native} with an editable PowerPoint chart, ${slides.length - native} as a vector picture.${skipped ? ` Skipped ${skipped} (no data).` : ""}`,
      );
    } catch {
      setSaid(pl ? "Nie udało się przygotować pliku PowerPoint." : "Could not prepare the PowerPoint file.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={`kc kc--${mode}`}>
      <div className="t-pagehead kc-head">
        <div className="t-pagehead__text">
          <p className="small kc-head__back">
            <Link to="/kolekcje">{pl ? "← Kolekcje" : "← Collections"}</Link>
          </p>
          <h1 className="page-title kc-head__title">
            <label className="zt-sr" htmlFor="kc-name">
              {pl ? "Nazwa kolekcji" : "Collection name"}
            </label>
            <input
              id="kc-name"
              className="kc-input kc-input--title"
              value={c.name}
              maxLength={80}
              onChange={(e) => onList(renameCollection(store(), c.id, e.target.value))}
            />
          </h1>
        </div>
        <div className="t-pagehead__right kc-head__tools">
          <Segmented<Mode>
            label={pl ? "Widok kolekcji" : "Collection view"}
            value={mode}
            onChange={setModeUrl}
            options={[
              { value: "board", label: pl ? "Tablica" : "Board" },
              { value: "slides", label: pl ? "Slajdy" : "Slides" },
            ]}
          />
          <button type="button" className="zt-btn zt-btn--primary" disabled={!n || busy || ready === 0} onClick={() => void exportAll()}>
            {pl ? "Pobierz PowerPoint" : "Download PowerPoint"}
            {n ? ` (${n})` : ""}
          </button>
        </div>
      </div>
      <p className="zt-sr" role="status" aria-live="polite">
        {said}
      </p>
      {said ? (
        <p className="small kc-said" aria-hidden="true">
          {said}
        </p>
      ) : null}
      {!n ? (
        <div className="zt-card kc-empty">
          <h2 className="card-title">{pl ? "Ta kolekcja jest pusta" : "This collection is empty"}</h2>
          <p className="body">
            {pl
              ? "Otwórz wykres w eksploratorze i wybierz „Zapisz”, potem „Dodaj do kolekcji”, albo dodaj poniżej jeden z zapisanych widoków."
              : "Open a chart in the explorer and choose “Save”, then “Add to collection”, or add one of your saved views below."}
          </p>
          <p className="kc-empty__go">
            <Link to="/explore" className="zt-btn zt-btn--primary">
              {pl ? "Otwórz eksplorator" : "Open the explorer"}
            </Link>
          </p>
        </div>
      ) : null}
      {mode === "slides" && n ? (
        <div className="kc-pager" role="group" aria-label={pl ? "Slajdy" : "Slides"}>
          <button type="button" className="zt-btn" onClick={() => go(-1)} disabled={cur === 0}>
            <Icon name="chevronLeft" size={16} />
            {pl ? "Poprzedni" : "Previous"}
          </button>
          <span className="kc-pager__n" aria-live="polite">
            {pl ? `Slajd ${cur + 1} z ${n}` : `Slide ${cur + 1} of ${n}`}
          </span>
          <button type="button" className="zt-btn" onClick={() => go(1)} disabled={cur >= n - 1}>
            {pl ? "Następny" : "Next"}
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      ) : null}
      <ol className="kc-items">
        {c.items.map((item, i) => (
          <CollectionCard
            key={item.id}
            item={item}
            index={i}
            count={n}
            cat={cat}
            lang={lang}
            mode={mode}
            hidden={mode === "slides" && i !== cur}
            register={register}
            onTitle={(title) => onList(updateItem(store(), c.id, item.id, { title }))}
            onComment={(comment) => onList(updateItem(store(), c.id, item.id, { comment }))}
            onMove={(d) => {
              onList(moveItem(store(), c.id, item.id, d));
              if (mode === "slides") go(d);
            }}
            onRemove={() => onList(removeItem(store(), c.id, item.id))}
          />
        ))}
      </ol>
      {saved.length ? (
        <section className="zt-card kc-add" aria-labelledby="kc-add-h">
          <h2 className="card-title" id="kc-add-h">
            {pl ? "Dodaj zapisany widok" : "Add a saved view"}
          </h2>
          <ul className="kc-add__list">
            {saved.map((v) => (
              <li key={v.id}>
                <button type="button" className="zt-btn" onClick={() => onList(addItem(store(), c.id, { url: v.url }))}>
                  <span aria-hidden="true">+</span> {v.name}
                  <Sr>{pl ? ": dodaj do kolekcji" : ": add to the collection"}</Sr>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

const fileStem = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "kolekcja";

// ---------- one pinned view

function CollectionCard({
  item,
  index,
  count,
  cat,
  lang,
  mode,
  hidden,
  register,
  onTitle,
  onComment,
  onMove,
  onRemove,
}: {
  item: CollectionItem;
  index: number;
  count: number;
  cat: Catalog | undefined;
  lang: Lang;
  mode: Mode;
  hidden: boolean;
  register: (id: string, fn: Exporter | null) => void;
  onTitle: (t: string) => void;
  onComment: (t: string) => void;
  onMove: (d: 1 | -1) => void;
  onRemove: () => void;
}) {
  const pl = lang === "pl";
  const uid = useId();
  const cardRef = useRef<HTMLLIElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const q = useMemo(() => (cat ? parseExplore(new URL(item.url, "https://x").search, cat) : null), [cat, item.url]);
  const shape = useMemo(() => (q && cat ? shapeOf(q, cat) : null), [q, cat]);
  const result = useExploreData(cat, q, shape, lang);
  const v = result.view;
  const ok = !!v && !v.empty && !v.needs.length;
  const source = cat && q && v ? sourceLineOf(cat, q, v.kpis, lang) : "";
  const title = item.title || v?.title || (pl ? "Widok" : "View");
  // The card offers itself to the export of the whole collection once its chart is drawn.
  useEffect(() => {
    if (!ok || !v || !cat || !q) return;
    register(item.id, () =>
      viewSlide(
        {
          view: v,
          lang,
          source,
          legend: legendFrom(cardRef.current),
          picture: () => {
            const text = { title: "", source: "", legend: v.matrix ? [] : legendFrom(cardRef.current) };
            if (v.matrix) {
              const m = v.matrix;
              const p = tablePlan(text, {
                columns: [m.colHead ? `${m.rowHead} \\ ${m.colHead}` : m.rowHead, ...m.cols.map((c) => c.label)],
                rows: m.rows.map((r, i) => [r.label, ...m.cells[i]!]),
                numeric: [false, ...m.cols.map(() => true)],
              });
              return { svg: planSvg(p), w: p.w, h: p.h };
            }
            const p = bodyRef.current ? chartPlan(bodyRef.current, text) : null;
            return p ? { svg: planSvg(p), w: p.w, h: p.h } : null;
          },
          title: item.title,
          comment: item.comment,
          link: typeof window === "undefined" ? undefined : new URL(item.url, window.location.origin).href,
        },
        deckTheme(),
      ),
    );
    return () => register(item.id, null);
  }, [ok, v, cat, q, lang, source, item.id, item.title, item.comment, item.url, register]);
  const body =
    result.state === "loading" || !cat ? (
      <ChartState state={{ kind: "loading" }} lang={lang} />
    ) : result.state === "error" ? (
      <ChartState state={{ kind: "error", text: result.error ?? "" }} lang={lang} />
    ) : !v || !ok ? (
      <ChartState
        state={{
          kind: "empty",
          text:
            v?.empty ??
            (pl
              ? "Tego widoku nie da się już narysować. Otwórz go w eksploratorze i popraw."
              : "This view can no longer be drawn. Open it in the explorer and fix it."),
        }}
        lang={lang}
      />
    ) : v.matrix ? (
      <MatrixTable m={v.matrix} caption={v.title} lang={lang} />
    ) : v.grid ? (
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
    );
  return (
    <li
      ref={cardRef}
      className={`zt-card kc-card${hidden ? " kc-card--off" : ""}`}
      aria-hidden={hidden || undefined}
      aria-labelledby={`${uid}-t`}
    >
      <div className="kc-card__head">
        <span className="kc-card__n" aria-hidden="true">
          {index + 1}
        </span>
        <div className="kc-card__titles">
          <label className="zt-sr" htmlFor={`${uid}-ti`}>
            {pl ? `Tytuł widoku ${index + 1}` : `Title of view ${index + 1}`}
          </label>
          <input
            id={`${uid}-ti`}
            className="kc-input kc-input--h"
            value={item.title}
            placeholder={v?.title ?? ""}
            maxLength={140}
            onChange={(e) => onTitle(e.target.value)}
          />
          <h2 className="zt-sr" id={`${uid}-t`}>
            {title}
          </h2>
          {v && ok ? <p className="zt-card__sub kc-card__sub">{v.sub}</p> : null}
          {v && ok && v.finding ? <p className="x3-finding">{v.finding}</p> : null}
        </div>
        <div className="kc-card__tools">
          <button type="button" className="zt-btn zt-btn--icon" onClick={() => onMove(-1)} disabled={index === 0}>
            <Icon name="chevronLeft" size={14} />
            <Sr>{pl ? `Przesuń wcześniej: ${title}` : `Move earlier: ${title}`}</Sr>
          </button>
          <button type="button" className="zt-btn zt-btn--icon" onClick={() => onMove(1)} disabled={index === count - 1}>
            <Icon name="chevronRight" size={14} />
            <Sr>{pl ? `Przesuń dalej: ${title}` : `Move later: ${title}`}</Sr>
          </button>
          <button type="button" className="zt-btn zt-btn--icon" onClick={onRemove}>
            <Icon name="close" size={14} />
            <Sr>{pl ? `Usuń z kolekcji: ${title}` : `Remove from the collection: ${title}`}</Sr>
          </button>
        </div>
      </div>
      <div className="kc-card__main">
        <div ref={bodyRef} className="t-card__body kc-card__body">
          {body}
          {v && ok && v.legend && !v.matrix ? <Legend chart={v.legend} /> : null}
        </div>
        <div className="kc-card__side">
          <label className="kc-card__label" htmlFor={`${uid}-c`}>
            {pl ? "Komentarz" : "Comment"}
          </label>
          <textarea
            id={`${uid}-c`}
            className="kc-input kc-input--area"
            rows={mode === "slides" ? 8 : 3}
            value={item.comment}
            maxLength={600}
            placeholder={
              pl ? "Co ten wykres mówi? Trafi na slajd obok wykresu." : "What does this chart say? It goes on the slide beside the chart."
            }
            onChange={(e) => onComment(e.target.value)}
          />
        </div>
      </div>
      <p className="caption kc-card__foot">
        <span>{source}</span>
        <span className="kc-card__links">
          {v && ok ? (
            <span className="kc-card__kind">
              {isNative(v)
                ? pl
                  ? "PowerPoint: wykres edytowalny"
                  : "PowerPoint: editable chart"
                : pl
                  ? "PowerPoint: grafika wektorowa"
                  : "PowerPoint: vector picture"}
            </span>
          ) : null}
          <Link to={item.url.replace("mode=view", "mode=edit")}>{pl ? "Otwórz w eksploratorze" : "Open in the explorer"}</Link>
        </span>
      </p>
    </li>
  );
}
