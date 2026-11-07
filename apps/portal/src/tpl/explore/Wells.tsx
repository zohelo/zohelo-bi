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
import { FAMILY_INFO } from "@zohelo/visuals";
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
  type Shape,
  type SlotKey,
} from "./exploreState";
import { FieldType, WellChoice, startDrag, wellName } from "./FieldList";
import { KIND_INFO, kindLabel, kindsByFamily, measureWells, valuesLabel } from "./kinds";
import { hasVoivodeships } from "./kpiInfo";
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

/** The chart picker: every kind of the library, grouped by style family; what a kind needs; why one is unavailable. */
function ChartPicker({ cat, q, shape, lang, onPatch, recs }: Common & { recs: ChartKind[] }) {
  const pl = lang === "pl";
  return (
    <PopButton
      className="zt-btn x3-picker"
      title={pl ? "Typ wykresu" : "Chart type"}
      closeLabel={pl ? "Zamknij" : "Close"}
      size="lg"
      trigger={
        <>
          <KindIcon d={KIND_INFO[q.chart].icon} />
          <span>
            {pl ? "Wizualizacja: " : "Visual: "}
            <strong>{kindLabel(q.chart, lang)}</strong>
          </span>
          <Icon name="chevronDown" size={14} />
        </>
      }
    >
      {(close) => (
        <div className="x3-kinds">
          {kindsByFamily().map(({ family, kinds }) => (
            <section key={family} className="x3-kinds__fam" aria-labelledby={`x3-fam-${family}`}>
              <h3 className="x3-kinds__h" id={`x3-fam-${family}`}>
                {pl ? FAMILY_INFO[family].pl : FAMILY_INFO[family].en}
              </h3>
              <div className="x3-kinds__grid">
                {kinds.map((k) => {
                  const v = possible(k, shape, q);
                  const need = v.ok ? needsIfChosen(cat, q, k, lang) : "";
                  return (
                    <button
                      key={k}
                      type="button"
                      className="x3-kind"
                      aria-pressed={q.chart === k}
                      disabled={!v.ok}
                      onClick={() => {
                        onPatch({ chart: k });
                        close();
                      }}
                    >
                      <KindIcon d={KIND_INFO[k].icon} />
                      <span className="x3-kind__name">
                        {kindLabel(k, lang)}
                        {recs.includes(k) ? <span className="x3-kind__rec">{pl ? "polecany" : "suggested"}</span> : null}
                      </span>
                      {!v.ok ? (
                        <span className="x3-kind__why">{pl ? v.reason.pl : v.reason.en}</span>
                      ) : need ? (
                        <span className="x3-kind__why">{need}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="xp-help">
            {pl
              ? "Każdy typ można wybrać: pola przechodzą do jego studzienek, a brakujące wykres wskaże. IBCS i odchylenia porównują wykonanie (AC) z tym samym okresem rok wcześniej (PY)."
              : "Any type can be chosen: the fields move to its wells and the chart says what is missing. IBCS and variance charts compare the actual (AC) with the same period a year earlier (PY)."}
          </p>
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

export function Wells({ cat, q, shape, lang, onPatch, dragging, onDrag }: Common & DragProps) {
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
  return (
    <section className="x3-wells" aria-label={pl ? "Wykres: typ i pola" : "Chart: type and fields"}>
      <div className="x3-wells__top">
        <ChartPicker {...common} recs={recs} />
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
        {recs.filter((r) => r !== q.chart).length ? (
          <div className="x3-recs" role="group" aria-label={pl ? "Polecane typy" : "Suggested types"}>
            <span className="small x3-recs__label">{pl ? "Polecane:" : "Suggested:"}</span>
            {recs
              .filter((r) => r !== q.chart)
              .map((r) => (
                <button key={r} type="button" className="zt-chip x3-rec" onClick={() => onPatch({ chart: r })}>
                  <KindIcon d={KIND_INFO[r].icon} />
                  {kindLabel(r, lang)}
                </button>
              ))}
          </div>
        ) : null}
      </div>
      <div className="x3-wells__grid">
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
