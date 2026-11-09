// Wizualizacja + wells of the explorer, the top of the centre zone (Power BI visualizations pane, laid out across):
//   chart picker grouped by style family (standard, IBCS, variances, editorial): every kind can be chosen; a kind
//   that still needs a field says which, only a kind that cannot be drawn at all is disabled; up to three are
//   recommended for the placed fields
//   wells named for the chart: Wartości (oś Y) or one well per measure (scatter X / Y, bubble size, combo columns /
//   line, map colour), Oś X, Legenda, Małe wielokrotności, Wiersze / Kolumny, Punkty, Kroki…, and Filtry (every
//   dimension not on the chart, showing one value, plus the time range)
//   drill bar (canvas): a dimension placed as a hierarchy (Kalendarz, Geografia) moves up and down its levels
// Fields can be dropped on a well; every chip opens its members, level and "Przenieś do…"; an issue shows on its well.

import { useId, useState, type DragEvent, type ReactNode } from "react";
import {
  CHART_FUNCTIONS,
  CHART_STYLES,
  FUNCTION_INFO,
  GROUP_INFO,
  LIBRARY,
  NEED_INFO,
  PICKER_GROUPS,
  STYLE_INFO,
  type ChartFunction,
  type ChartStyle,
  type ChartTypeDef,
  type ChartVariant,
  type TypeId,
} from "@zohelo/visuals";
import { KIND_VARIANT, VARIANT_BASE, currentVariant, variantVerdict } from "./variants";
import type { Catalog, GeoLevel } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { geoName, kpiName, sourceName } from "../chartData";
import { Icon } from "../ui/icons";
import {
  MAX_KPIS,
  applyPatch,
  filterValue,
  placedDims,
  slotOf,
  type ChartKind,
  type DimId,
  type Query,
  type QueryInput,
  type Shape,
  type SlotKey,
} from "./exploreState";
import { FieldType, WellChoice, startDrag, wellName } from "./FieldList";
import { KIND_INFO, measureWells, valuesLabel } from "./kinds";
import { hasVoivodeships, voivodeshipKeys } from "./kpiInfo";
import { SLOTS, layoutIssues, missing, possible, recommend, swapSlots } from "./layout";
import { GRAINS, supportsGrain, type Grain } from "./model";
import { DRAG_TYPE, fitWell, placePatch, removePatch, sensibleWell, type Field, type Fit } from "./place";
import { AreasPop, CompareOptions, MemberPop, PeriodPop, periodText, type Patch } from "./pops";
import { PopButton } from "./PopButton";
import { dimName, memberLabel } from "./view";

type Common = { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch };
const at = (pair: [string, string], lang: Lang) => pair[lang === "pl" ? 0 : 1];

function KindIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** What a kind would still need if chosen now (its wells filled from the current fields, as a switch does). */
function needsIfChosen(cat: Catalog, q: Query, k: ChartKind, lang: Lang): string {
  if (k === q.chart) return "";
  const next = applyPatch(q, { chart: k }, cat);
  if (next.chart !== k) return "";
  const n = missing(k, next);
  if (!n.length) return "";
  return `${lang === "pl" ? "uzupełnij" : "add"} ${n.map((x) => (lang === "pl" ? x.pl : x.en)).join(", ")}`;
}

/** Icons of the library types (the base kind's icon unless the type has its own). */
const TYPE_ICON: Partial<Record<TypeId, string>> = {
  pie: "M9 2.5a6.5 6.5 0 106.5 6.5H9z M11 1.5v5.5h5.5A5.5 5.5 0 0011 1.5z",
  waffle: "M3 3h3v3H3zM7.5 3h3v3h-3zM12 3h3v3h-3zM3 7.5h3v3H3zM7.5 7.5h3v3h-3zM3 12h3v3H3z",
  strip: "M2 9h14M4 7v4M7 6v6M9.5 8v2M12 6.5v5M14.5 8v2",
  fan: "M2 12l5-3 4 1M7 9l9-5M7 9l9 1M7 9l9 6",
  symbols: "M5.5 8a3 3 0 100-6 3 3 0 000 6zM12.5 15a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM12 5.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  sankey: "M2 3h2v5H2zM14 2h2v4h-2zM14 9h2v7h-2zM4 4c5 0 5-1 10-1M4 7c5 0 5 5 10 5",
  kpi: "M2.5 3.5h13v11h-13zM5 11.5l2.5-3 2 2 3.5-4",
  sparkline: "M2 12l3-4 3 2 3-6 2 3 3-2",
  table: "M2.5 3.5h13v11h-13zM2.5 7.5h13M2.5 11h13M7 3.5v11",
  bullet: "M2 6h14v6H2zM2 8h9v2H2zM13 4.5v9",
};
function typeIcon(t: ChartTypeDef): string {
  return TYPE_ICON[t.id] ?? KIND_INFO[VARIANT_BASE[t.variants[0]!.id]!].icon;
}

/** Extra settings a variant needs when picked (its wells or the compare mode). */
function variantPatch(cat: Catalog, q: Query, v: ChartVariant): Partial<QueryInput> {
  const base = VARIANT_BASE[v.id]!;
  const p: Partial<QueryInput> = { chart: base, v: v.id };
  if (v.id === "line.indexed") p.cmp = "index";
  if (v.id === "scatter.connected" || v.id === "bubble.connected") p.slots = { x: "t" };
  if (v.id === "heatmap.correlation") p.slots = { x: "t", legend: "i" };
  if (v.id === "tiles.mini" || v.id === "area.range") {
    p.level = "voivodeship";
    p.geo = v.id === "area.range" ? ["PL", ...voivodeshipKeys(cat)] : voivodeshipKeys(cat);
    p.slots = { x: "t", legend: "geo" };
  }
  if (base === q.chart && !p.slots) p.slots = q.slots;
  return p;
}

/**
 * The chart picker (chart library v2): types grouped by job on the left, the chosen type's variants on the right,
 * filters by function and style above. Unavailable variants stay visible with the reason.
 */
function ChartPicker({ cat, q, shape, lang, onPatch, recs }: Common & { recs: ChartKind[] }) {
  const pl = lang === "pl";
  const cur = currentVariant(q.chart, q.v);
  const curType = LIBRARY.find((t) => t.id === cur.type)!;
  const [fn, setFn] = useState<ChartFunction | null>(null);
  const [style, setStyle] = useState<ChartStyle | null>(null);
  const [typeSel, setTypeSel] = useState<TypeId>(cur.type);
  const recVariants = new Set(recs.map((k) => KIND_VARIANT[k]));
  const ctx = {
    voivodeships: shape.kpis.some(hasVoivodeships),
    periods: shape.periods.length,
    years: shape.span[1] - shape.span[0] + 1,
    measures: q.i.length,
  };
  const match = (v: ChartVariant) => (!fn || v.functions.includes(fn)) && (!style || v.styles.includes(style));
  const types = LIBRARY.filter((t) => t.variants.some(match));
  const shownType = types.find((t) => t.id === typeSel) ?? types[0];
  const chip = <T extends string>(value: T | null, on: T | null, set: (v: T | null) => void, label: string) => (
    <button key={value ?? "all"} type="button" className="zt-chip x3-lib__chip" aria-pressed={on === value} onClick={() => set(value)}>
      {label}
    </button>
  );
  return (
    <PopButton
      className="zt-btn x3-picker"
      title={pl ? "Typ wykresu" : "Chart type"}
      closeLabel={pl ? "Zamknij" : "Close"}
      size="lg"
      trigger={
        <>
          <KindIcon d={typeIcon(curType)} />
          <span>
            {pl ? "Wizualizacja: " : "Visual: "}
            <strong>{pl ? curType.pl : curType.en}</strong>
            {curType.variants.length > 1 ? <span className="x3-picker__var"> · {pl ? cur.pl : cur.en}</span> : null}
          </span>
          <Icon name="chevronDown" size={14} />
        </>
      }
    >
      {(close) => (
        <div className="x3-lib">
          <div className="x3-lib__filters">
            <div className="x3-lib__row" role="group" aria-label={pl ? "Co ma pokazać wykres" : "What the chart shows"}>
              <span className="small x3-lib__label">{pl ? "Zadanie" : "Job"}</span>
              {chip(null, fn, setFn, pl ? "Wszystkie" : "All")}
              {CHART_FUNCTIONS.map((f) => chip(f, fn, setFn, pl ? FUNCTION_INFO[f].pl : FUNCTION_INFO[f].en))}
            </div>
            <div className="x3-lib__row" role="group" aria-label={pl ? "Styl" : "Style"}>
              <span className="small x3-lib__label">{pl ? "Styl" : "Style"}</span>
              {chip(null, style, setStyle, pl ? "Wszystkie" : "All")}
              {CHART_STYLES.map((st) => chip(st, style, setStyle, (pl ? STYLE_INFO[st].pl : STYLE_INFO[st].en).replace(/ \(.*\)$/, "")))}
            </div>
          </div>
          <div className="x3-lib__body">
            <div className="x3-lib__types">
              {PICKER_GROUPS.map((g) => {
                const ts = types.filter((t) => t.group === g);
                if (!ts.length) return null;
                return (
                  <section key={g} className="x3-lib__group" aria-labelledby={`x3-lg-${g}`}>
                    <h3 className="x3-kinds__h" id={`x3-lg-${g}`}>
                      {pl ? GROUP_INFO[g].pl : GROUP_INFO[g].en}
                    </h3>
                    {ts.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="x3-lib__type"
                        aria-pressed={shownType?.id === t.id}
                        aria-current={cur.type === t.id ? "true" : undefined}
                        onClick={() => setTypeSel(t.id)}
                      >
                        <KindIcon d={typeIcon(t)} />
                        <span className="x3-lib__tname">{pl ? t.pl : t.en}</span>
                        {t.variants.some((v) => recVariants.has(v.id)) ? (
                          <span className="x3-kind__rec">{pl ? "polecany" : "suggested"}</span>
                        ) : null}
                        <span className="x3-lib__count">{t.variants.filter(match).length}</span>
                      </button>
                    ))}
                  </section>
                );
              })}
            </div>
            {shownType ? (
              <section className="x3-lib__variants" aria-labelledby="x3-lib-vh">
                <h3 className="x3-lib__vh" id="x3-lib-vh">
                  {pl ? shownType.pl : shownType.en}
                </h3>
                <div className="x3-kinds__grid">
                  {shownType.variants.filter(match).map((v) => {
                    const base = VARIANT_BASE[v.id]!;
                    const can = possible(base, shape, q);
                    const ver = variantVerdict(v, ctx);
                    const why = !can.ok
                      ? pl
                        ? can.reason.pl
                        : can.reason.en
                      : !ver.ok
                        ? pl
                          ? NEED_INFO[ver.need].pl
                          : NEED_INFO[ver.need].en
                        : "";
                    const need = !why && base !== q.chart ? needsIfChosen(cat, q, base, lang) : "";
                    return (
                      <button
                        key={v.id}
                        type="button"
                        className="x3-kind"
                        aria-pressed={cur.id === v.id}
                        disabled={!!why}
                        onClick={() => {
                          onPatch(variantPatch(cat, q, v));
                          close();
                        }}
                      >
                        <span className="x3-kind__name">
                          {pl ? v.pl : v.en}
                          {recVariants.has(v.id) ? <span className="x3-kind__rec">{pl ? "polecany" : "suggested"}</span> : null}
                        </span>
                        <span className="x3-kind__use">{pl ? v.usePl : v.useEn}</span>
                        <span className="x3-kind__tags">
                          {v.styles.map((st) => (
                            <span key={st} className="x3-kind__tag">
                              {(pl ? STYLE_INFO[st].pl : STYLE_INFO[st].en).replace(/ \(.*\)$/, "")}
                            </span>
                          ))}
                        </span>
                        {why ? <span className="x3-kind__why">{why}</span> : need ? <span className="x3-kind__why">{need}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : (
              <p className="xp-help">{pl ? "Żaden typ nie pasuje do filtrów." : "No type matches the filters."}</p>
            )}
          </div>
        </div>
      )}
    </PopButton>
  );
}

/** Members, order or period of one dimension chip (what the chip shows). */
function DimPop({ cat, q, shape, lang, onPatch, dim }: Common & { dim: DimId }) {
  if (dim === "geo") return <AreasPop cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />;
  if (dim === "t") return <PeriodPop q={q} shape={shape} lang={lang} onPatch={onPatch} />;
  if (dim === "i") return <IndicatorOrder cat={cat} q={q} lang={lang} onPatch={onPatch} />;
  if (dim === "t.moy" || dim === "t.qoy") return null;
  return <MemberPop cat={cat} q={q} dim={dim} lang={lang} onPatch={onPatch} />;
}

function IndicatorOrder({ cat, q, lang, onPatch }: Omit<Common, "shape">) {
  const pl = lang === "pl";
  const move = (k: string, by: -1 | 1) => {
    const i = q.i.indexOf(k);
    const next = q.i.slice();
    next.splice(i, 1);
    next.splice(i + by, 0, k);
    onPatch({ i: next, cmp: q.cmp });
  };
  return (
    <ol className="x3-order">
      {q.i.map((k, i) => {
        const kpi = cat.kpis.find((x) => x.kpi_key === k);
        const name = kpi ? kpiName(kpi, lang) : k;
        return (
          <li key={k}>
            <span>{name}</span>
            <button type="button" className="xp-icon" disabled={i === 0} onClick={() => move(k, -1)}>
              ↑<span className="zt-sr"> {pl ? `Wyżej: ${name}` : `Up: ${name}`}</span>
            </button>
            <button type="button" className="xp-icon" disabled={i === q.i.length - 1} onClick={() => move(k, 1)}>
              ↓<span className="zt-sr"> {pl ? `Niżej: ${name}` : `Down: ${name}`}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function chipCount(q: Query, shape: Shape, d: DimId): number {
  if (d === "geo")
    return q.level === "voivodeship" && (q.chart === "map" || q.chart === "choro" || q.chart === "boxplot") ? 16 : q.geo.length;
  return shape.members[d]?.length ?? 0;
}

type DragProps = { dragging: Field | null; onDrag: (f: Field | null) => void };

/** A drop target with its name, chips, a hint when empty, why a dragged field cannot go here, and its issue. */
function Well({
  name,
  dragging,
  onDrag,
  fit,
  onField,
  children,
  issue,
  hint,
  lang,
  required,
  className,
}: DragProps & {
  className?: string;
  name: string;
  fit: (f: Field) => Fit;
  onField: (f: Field) => void;
  children?: ReactNode;
  issue?: string;
  hint?: string;
  lang: Lang;
  required?: boolean;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const can = dragging ? fit(dragging) : null;
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    let f: Field | null = dragging;
    try {
      f = JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as Field;
    } catch {
      /* keep the field from state */
    }
    onDrag(null);
    if (f && fit(f).ok) onField(f);
  };
  return (
    <div
      className={`x3-well${className ? ` ${className}` : ""}${dragging ? (can?.ok ? " is-can" : " is-cannot") : ""}${over && can?.ok ? " is-over" : ""}${issue ? " is-bad" : ""}${required ? " is-needed" : ""}`}
      role="group"
      aria-labelledby={id}
      onDragOver={(e) => {
        if (!can?.ok) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <p className="x3-well__name" id={id}>
        {name}
        {required ? <span className="x3-well__req">{lang === "pl" ? " · wymagane" : " · required"}</span> : null}
      </p>
      <div className="x3-well__chips">
        {children}
        {hint ? <span className="x3-well__hint">{hint}</span> : null}
      </div>
      {dragging && can && !can.ok ? <p className="x3-well__why">{lang === "pl" ? can.why.pl : can.why.en}</p> : null}
      {issue ? <p className="xp-issue">{issue}</p> : null}
    </div>
  );
}

const GROUP_NAME: Record<string, [string, string]> = { t: ["Kalendarz", "Calendar"], geo: ["Geografia", "Geography"] };

/** A chip of a dimension in a well, or a filter. */
function DimChip({
  cat,
  q,
  shape,
  lang,
  onPatch,
  onDrag,
  dim,
  mode,
}: Common & { onDrag: (f: Field | null) => void; dim: DimId; mode: "slot" | "filter" }) {
  const pl = lang === "pl";
  const hier = q.hier.includes(dim);
  const f: Field = dim === "i" ? { kind: "names", key: "i" } : { kind: "dim", key: dim, ...(hier ? { hier: true } : {}) };
  const level = dimName(cat, dim, lang, { grain: shape.grain, level: q.level });
  const name = hier && GROUP_NAME[dim] ? `${at(GROUP_NAME[dim]!, lang)} › ${level}` : level;
  const n = chipCount(q, shape, dim);
  const value = filterValue(q, shape, dim);
  const ms = shape.members[dim] ?? [];
  const label = mode === "filter" ? `${name}: ${value ? memberLabel(cat, dim, value, lang) : "–"}` : `${name}${n > 1 ? ` (${n})` : ""}`;
  return (
    <span className={`x3-chip x3-chip--${mode}`}>
      <PopButton
        className="x3-chip__btn"
        title={name}
        closeLabel={pl ? "Zamknij" : "Close"}
        size={dim === "geo" || dim === "t" ? "md" : "sm"}
        draggable
        onDragStart={(e) => startDrag(e, f, onDrag)}
        onDragEnd={() => onDrag(null)}
        trigger={
          <>
            <FieldType f={f} />
            <span className="x3-chip__label">{label}</span>
            {mode === "filter" ? <Icon name="chevronDown" size={12} /> : null}
          </>
        }
      >
        {(close) => (
          <>
            {mode === "filter" && ms.length > 1 ? (
              <FilterValue cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} dim={dim} />
            ) : null}
            {mode !== "filter" || dim === "geo" || dim === "t" ? (
              <DimPop cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} dim={dim} />
            ) : null}
            <p className="xp-label ex-m0">{pl ? "Przenieś do" : "Move to"}</p>
            <WellChoice cat={cat} q={q} shape={shape} lang={lang} f={f} onPatch={onPatch} close={close} />
          </>
        )}
      </PopButton>
      {mode === "slot" ? (
        <button type="button" className="x3-chip__x" onClick={() => onPatch(removePatch(q, f))}>
          <Icon name="close" size={12} />
          <span className="zt-sr">{pl ? `Zdejmij z wykresu: ${name}` : `Take off the chart: ${name}`}</span>
        </button>
      ) : null}
    </span>
  );
}

/** The one value a filter dimension shows. */
function FilterValue({ cat, q, shape, lang, onPatch, dim }: Common & { dim: DimId }) {
  const pl = lang === "pl";
  const id = useId();
  const ms = shape.members[dim] ?? [];
  return (
    <div className="xp-slot">
      <label className="xp-slot__name" htmlFor={id}>
        {pl ? "Pokazana wartość" : "Value shown"}
      </label>
      <select
        id={id}
        className="ex-select ex-select--full"
        value={filterValue(q, shape, dim) ?? ""}
        onChange={(e) => onPatch({ filters: { ...q.filters, [dim]: e.target.value } })}
      >
        {(dim === "t" ? ms.slice().reverse() : ms).map((m) => (
          <option key={m} value={m}>
            {memberLabel(cat, dim, m, lang)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ValueChip({ cat, q, shape, lang, onPatch, onDrag, kpi }: Common & { onDrag: (f: Field | null) => void; kpi: string }) {
  const pl = lang === "pl";
  const id = useId();
  const k = cat.kpis.find((x) => x.kpi_key === kpi);
  if (!k) return null;
  const name = kpiName(k, lang);
  const f: Field = { kind: "kpi", key: kpi };
  return (
    <span className="x3-chip x3-chip--value">
      <PopButton
        className="x3-chip__btn"
        title={name}
        closeLabel={pl ? "Zamknij" : "Close"}
        size="md"
        draggable
        onDragStart={(e) => startDrag(e, f, onDrag)}
        onDragEnd={() => onDrag(null)}
        trigger={
          <>
            <FieldType f={f} />
            <span className="x3-chip__label">{name}</span>
          </>
        }
      >
        <>
          {k.source_keys.length > 1 ? (
            <div className="xp-slot">
              <label className="xp-slot__name" htmlFor={id}>
                {pl ? "Źródło" : "Source"}
              </label>
              <select
                id={id}
                className="ex-select ex-select--full"
                value={q.src[kpi] ?? k.source_keys[0]}
                onChange={(e) => onPatch({ src: { ...q.src, [kpi]: e.target.value } })}
              >
                {k.source_keys.map((s) => (
                  <option key={s} value={s}>
                    {sourceName(cat, s, lang)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="xp-help">
              {pl ? "Źródło: " : "Source: "}
              {sourceName(cat, k.source_keys[0] ?? "", lang)}
            </p>
          )}
          {q.i.length > 1 ? <IndicatorOrder cat={cat} q={q} lang={lang} onPatch={onPatch} /> : null}
          <CompareOptions q={q} shape={shape} lang={lang} onPatch={onPatch} />
          <p className="t-info__links">
            <Link to={`/kpi/${kpi}`}>{pl ? "Strona wskaźnika i definicja" : "Indicator page and definition"}</Link>
          </p>
        </>
      </PopButton>
      <button type="button" className="x3-chip__x" onClick={() => onPatch(removePatch(q, f))}>
        <Icon name="close" size={12} />
        <span className="zt-sr">{pl ? `Usuń miarę: ${name}` : `Remove measure: ${name}`}</span>
      </button>
    </span>
  );
}

const noFit = (pl: string, en: string): Fit => ({ ok: false, why: { pl, en } });

/** Breakdowns left at their total: one chip that opens them all (each value, or onto the chart). */
function QuietFilters({ cat, q, shape, lang, onPatch, dims }: Common & { dims: DimId[] }) {
  const pl = lang === "pl";
  const id = useId();
  return (
    <span className="x3-chip x3-chip--filter">
      <PopButton
        className="x3-chip__btn"
        title={pl ? "Inne wymiary" : "Other dimensions"}
        closeLabel={pl ? "Zamknij" : "Close"}
        size="md"
        trigger={
          <>
            <FieldType f={{ kind: "dim", key: dims[0]! }} />
            <span className="x3-chip__label">
              {pl ? `Inne wymiary (${dims.length}): ogółem` : `Other dimensions (${dims.length}): total`}
            </span>
            <Icon name="chevronDown" size={12} />
          </>
        }
      >
        {(close) => (
          <ul className="x3-quiet">
            {dims.map((d, j) => {
              const name = dimName(cat, d, lang);
              const ms = shape.members[d] ?? [];
              const target = sensibleWell(q, shape, cat, { kind: "dim", key: d });
              return (
                <li key={d}>
                  <label className="xp-slot__name" htmlFor={`${id}-${j}`}>
                    {name}
                  </label>
                  <div className="x3-quiet__row">
                    <select
                      id={`${id}-${j}`}
                      className="ex-select"
                      value={filterValue(q, shape, d) ?? ""}
                      disabled={ms.length < 2}
                      onChange={(e) => onPatch({ filters: { ...q.filters, [d]: e.target.value } })}
                    >
                      {ms.map((m) => (
                        <option key={m} value={m}>
                          {memberLabel(cat, d, m, lang)}
                        </option>
                      ))}
                    </select>
                    {target && target !== "filters" ? (
                      <button
                        type="button"
                        className="x3-add"
                        onClick={() => {
                          const p = placePatch(q, shape, cat, { kind: "dim", key: d }, target);
                          if (p) onPatch(p);
                          close();
                        }}
                      >
                        +
                        <span className="zt-sr">
                          {" "}
                          {pl ? `Dodaj „${name}” do: ${wellName(target, lang, q)}` : `Add “${name}” to: ${wellName(target, lang, q)}`}
                        </span>
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PopButton>
    </span>
  );
}

/** A measure into the j-th measure well (scatter X / Y / size, combo columns / line, map colour). */
function toMeasureWell(q: Query, key: string, j: number): string[] {
  const rest = q.i.filter((x) => x !== key);
  rest.splice(Math.min(j, rest.length), 0, key);
  return rest.slice(0, MAX_KPIS);
}

export function Wells({ cat, q, shape, lang, onPatch, dragging, onDrag, asked }: Common & DragProps & { asked?: boolean }) {
  const pl = lang === "pl";
  const common = { cat, q, shape, lang, onPatch };
  const drag = { dragging, onDrag, lang };
  const issues = layoutIssues(q, shape);
  const recs = q.i.length ? recommend(shape, q) : [];
  const slots = SLOTS[q.chart];
  const placed = placedDims(q);
  const mw = measureWells(q.chart);
  const dims: DimId[] = ["i", "geo", "t", ...shape.dims].filter((d) => (shape.members[d]?.length ?? 0) > 0);
  const filters = dims.filter((d) => !placed.has(d) && !(d === "i" && (q.i.length < 2 || mw)));
  // Measures, area and period always show; breakdowns at their total wait behind one chip.
  const loud = (d: DimId) => d === "i" || d === "geo" || d === "t" || (q.filters[d] !== undefined && q.filters[d] !== "total");
  const shownFilters = filters.filter(loud);
  const quiet = filters.filter((d) => !loud(d));
  const swap = swapSlots(q);
  const place = (well: SlotKey | "values" | "filters") => ({
    fit: (f: Field) => fitWell(q, shape, cat, f, well),
    onField: (f: Field) => {
      const p = placePatch(q, shape, cat, f, well);
      if (p) onPatch(p);
    },
  });
  const specs = KIND_INFO[q.chart].slots;
  // Short screens (review 2026-11-09): the wells fold into one summary line once a chart is drawn, so the chart
  // fits the window; they open by themselves while something needs fixing or a field is being dragged.
  const gridId = useId();
  const [open, setOpen] = useState(() => asked || typeof window === "undefined" || !window.matchMedia?.("(max-height: 820px)").matches);
  const show = open || !q.i.length || Object.keys(issues).length > 0 || !!dragging;
  const summary = [
    q.i.map((k) => kpiName(cat.kpis.find((x) => x.kpi_key === k) ?? { name_pl: k, name_en: k }, lang)).join(", "),
    ...slots
      .filter((sl) => q.slots[sl])
      .map((sl) => `${wellName(sl, lang, q)}: ${dimName(cat, q.slots[sl]!, lang, { grain: shape.grain, level: q.level })}`),
  ].join(" · ");
  return (
    <section
      className={`x3-wells${show ? "" : " is-folded"}${asked ? " is-asked" : ""}`}
      aria-label={pl ? "Wykres: typ i pola" : "Chart: type and fields"}
    >
      <div className="x3-wells__top">
        <ChartPicker {...common} recs={recs} />
        {q.i.length ? (
          <button
            type="button"
            className="zt-btn zt-btn--ghost x3-wells__fold"
            aria-expanded={show}
            aria-controls={gridId}
            onClick={() => setOpen(!show)}
            title={show ? undefined : summary}
          >
            <Icon name={show ? "chevronDown" : "chevronRight"} size={14} />
            <span className="x3-wells__summary">{show ? (pl ? "Zwiń pola wykresu" : "Fold the chart fields") : summary}</span>
          </button>
        ) : null}
        {swap && q.slots[slots[0]!] && q.slots[slots[1]!] ? (
          <button
            type="button"
            className="zt-btn zt-btn--ghost zt-btn--icon x3-swap"
            title={pl ? "Zamień" : "Swap"}
            aria-label={
              pl
                ? `Zamień: ${wellName(slots[0]!, lang, q)} i ${wellName(slots[1]!, lang, q)}`
                : `Swap: ${wellName(slots[0]!, lang, q)} and ${wellName(slots[1]!, lang, q)}`
            }
            onClick={() => onPatch({ slots: swap })}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                d="M2 5h10l-3-3M14 11H4l3 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="x3-wells__grid" id={gridId} hidden={!show}>
        {mw ? (
          mw.map((w, j) => {
            const k = q.i[j];
            return (
              <Well
                key={`m${j}`}
                name={at(w, lang)}
                {...drag}
                required={!k}
                issue={j === 0 && issues.values ? (pl ? issues.values.pl : issues.values.en) : undefined}
                fit={(f) =>
                  f.kind !== "kpi"
                    ? noFit("Tu pasuje tylko miara.", "Only a measure fits here.")
                    : !q.i.includes(f.key) && q.i.length >= MAX_KPIS
                      ? noFit(`Limit ${MAX_KPIS} miar.`, `Limit of ${MAX_KPIS} measures.`)
                      : { ok: true }
                }
                onField={(f) => onPatch({ i: toMeasureWell(q, f.key, j) })}
                hint={k ? undefined : pl ? "Upuść miarę albo kliknij ją w „Miarach”" : "Drop a measure or click one in “Measures”"}
              >
                {k ? <ValueChip {...common} onDrag={onDrag} kpi={k} /> : null}
              </Well>
            );
          })
        ) : (
          <Well
            name={valuesLabel(q.chart, lang)}
            {...drag}
            {...place("values")}
            required={!q.i.length}
            issue={issues.values ? (pl ? issues.values.pl : issues.values.en) : undefined}
            hint={q.i.length ? undefined : pl ? "Upuść miarę albo kliknij ją w „Miarach”" : "Drop a measure or click one in “Measures”"}
          >
            {q.i.map((k) => (
              <ValueChip key={k} {...common} onDrag={onDrag} kpi={k} />
            ))}
          </Well>
        )}
        {slots.map((s: SlotKey) => {
          const d = q.slots[s];
          const issue = issues[s];
          const sp = specs.find((x) => x.key === s);
          return (
            <Well
              key={s}
              name={wellName(s, lang, q)}
              {...drag}
              {...place(s)}
              required={!!sp?.required && !d}
              issue={issue ? (pl ? issue.pl : issue.en) : undefined}
              hint={d ? undefined : pl ? "Upuść wymiar" : "Drop a dimension"}
            >
              {d ? <DimChip {...common} onDrag={onDrag} dim={d} mode="slot" /> : null}
            </Well>
          );
        })}
        <Well name={wellName("filters", lang, q)} className="x3-well--filters" {...drag} {...place("filters")}>
          <span className="x3-chip x3-chip--filter">
            <PopButton
              className="x3-chip__btn"
              title={pl ? "Zakres czasu" : "Time range"}
              closeLabel={pl ? "Zamknij" : "Close"}
              trigger={
                <>
                  <FieldType f={{ kind: "dim", key: "t" }} />
                  <span className="x3-chip__label">
                    <span className="zt-sr">{pl ? "Zakres: " : "Range: "}</span>
                    {q.i.length ? periodText(q, shape, lang) : pl ? "dowolny" : "any"}
                  </span>
                  <Icon name="chevronDown" size={12} />
                </>
              }
            >
              <PeriodPop q={q} shape={shape} lang={lang} onPatch={onPatch} />
            </PopButton>
          </span>
          {q.i.length ? shownFilters.map((d) => <DimChip key={d} {...common} onDrag={onDrag} dim={d} mode="filter" />) : null}
          {q.i.length && quiet.length ? <QuietFilters {...common} dims={quiet} /> : null}
        </Well>
      </div>
      {mw && q.i.length > mw.length ? (
        <div className="x3-unused">
          <span className="small x3-unused__label">{pl ? "Nieużywane przez ten wykres:" : "Not used by this chart:"}</span>
          {q.i.slice(mw.length).map((k) => (
            <ValueChip key={k} {...common} onDrag={onDrag} kpi={k} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ---------- drill-down (canvas): a dimension placed as a hierarchy moves along its levels

const GRAIN_LABEL: Record<Grain, [string, string]> = { y: ["Rok", "Year"], q: ["Kwartał", "Quarter"], m: ["Miesiąc", "Month"] };

/** Breadcrumb of the levels of each hierarchy on the chart, with up / down and "drill into" a year. */
export function DrillBar({ cat, q, shape, lang, onPatch }: Common) {
  const pl = lang === "pl";
  const id = useId();
  const hs = q.hier.filter((d) => slotOf(q, d));
  if (!hs.length || !q.i.length) return null;
  const relevel = (d: DimId, extra: { grain?: Grain; level?: GeoLevel }, more: Parameters<Patch>[0] = {}) => {
    const s = slotOf(q, d);
    if (!s) return;
    const p = placePatch(q, shape, cat, { kind: "dim", key: d, hier: true, ...extra }, s);
    if (p) onPatch({ ...p, ...more });
  };
  return (
    <div className="x3-drill" role="group" aria-label={pl ? "Drążenie hierarchii" : "Drill through hierarchies"}>
      {hs.map((d) => {
        if (d === "t") {
          const grains = GRAINS.filter((g) => shape.kpis.some((k) => supportsGrain(k, g)));
          const cur = grains.indexOf(shape.grain);
          const down = grains[cur + 1];
          const up = cur > 0 ? grains[cur - 1] : undefined;
          const years = [...new Set(shape.periods.map((p) => p.slice(0, 4)))];
          const single = !("last" in q.time) && q.time.from === q.time.to;
          return (
            <div key={d} className="x3-drill__row">
              <span className="x3-drill__name">{pl ? "Kalendarz:" : "Calendar:"}</span>
              <ol className="x3-drill__path">
                {grains.map((g) => (
                  <li key={g}>
                    <button
                      type="button"
                      className="xp-link x3-drill__lvl"
                      aria-current={g === shape.grain ? "true" : undefined}
                      disabled={g === shape.grain}
                      onClick={() => relevel("t", { grain: g }, g === "y" && single ? { time: { last: 10 } } : {})}
                    >
                      {at(GRAIN_LABEL[g], lang)}
                    </button>
                  </li>
                ))}
              </ol>
              {up ? (
                <button
                  type="button"
                  className="zt-btn zt-btn--ghost x3-drill__btn"
                  onClick={() => relevel("t", { grain: up }, up === "y" && single ? { time: { last: 10 } } : {})}
                >
                  ↑ {pl ? "Wyżej" : "Up"}
                  <span className="zt-sr">: {at(GRAIN_LABEL[up], lang)}</span>
                </button>
              ) : null}
              {down ? (
                <button type="button" className="zt-btn zt-btn--ghost x3-drill__btn" onClick={() => relevel("t", { grain: down })}>
                  ↓ {pl ? "Niżej" : "Down"}
                  <span className="zt-sr">: {at(GRAIN_LABEL[down], lang)}</span>
                </button>
              ) : null}
              {down && shape.grain === "y" && years.length > 1 ? (
                <span className="x3-drill__into">
                  <label htmlFor={id}>{pl ? "Drąż do roku" : "Drill into"}</label>
                  <select
                    id={id}
                    className="ex-select"
                    value=""
                    onChange={(e) => {
                      const y = Number(e.target.value);
                      if (y) relevel("t", { grain: down }, { time: { from: y, to: y } });
                    }}
                  >
                    <option value="">{pl ? "wybierz" : "choose"}</option>
                    {years
                      .slice()
                      .reverse()
                      .map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                  </select>
                </span>
              ) : null}
            </div>
          );
        }
        if (d === "geo") {
          const levels: GeoLevel[] = shape.kpis.some(hasVoivodeships) ? ["country", "voivodeship"] : ["country"];
          const name = (l: GeoLevel) => (l === "country" ? (pl ? "Kraj" : "Country") : pl ? "Województwo" : "Voivodeship");
          const i = levels.indexOf(q.level);
          return (
            <div key={d} className="x3-drill__row">
              <span className="x3-drill__name">{pl ? "Geografia:" : "Geography:"}</span>
              <ol className="x3-drill__path">
                {levels.map((l) => (
                  <li key={l}>
                    <button
                      type="button"
                      className="xp-link x3-drill__lvl"
                      aria-current={l === q.level ? "true" : undefined}
                      disabled={l === q.level}
                      onClick={() => relevel("geo", { level: l })}
                    >
                      {name(l)}
                    </button>
                  </li>
                ))}
              </ol>
              {i > 0 ? (
                <button
                  type="button"
                  className="zt-btn zt-btn--ghost x3-drill__btn"
                  onClick={() => relevel("geo", { level: levels[i - 1] })}
                >
                  ↑ {pl ? "Wyżej" : "Up"}
                  <span className="zt-sr">: {name(levels[i - 1]!)}</span>
                </button>
              ) : null}
              {i < levels.length - 1 ? (
                <button
                  type="button"
                  className="zt-btn zt-btn--ghost x3-drill__btn"
                  onClick={() => relevel("geo", { level: levels[i + 1] })}
                >
                  ↓ {pl ? "Niżej" : "Down"}
                  <span className="zt-sr">: {name(levels[i + 1]!)}</span>
                </button>
              ) : null}
              {q.level === "voivodeship" && q.geo.length === 1 ? (
                <span className="small ex-muted">
                  {pl ? "wyróżnione" : "highlighted"}: {geoName(cat, q.geo[0]!, lang)}
                </span>
              ) : null}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}
