// Wizualizacja + wells of explorer v3, the top of the centre zone (Power BI visualizations pane, laid out across):
//   chart picker grouped by style family (standard, IBCS, variances, editorial) with up to three recommendations
//   for the placed fields; wells: Wartości (indicators), the chart's slots (Seria, Panele, Kategorie, Wiersze,
//   Kolumny), "Ustalone przez wykres" (what the type places itself, e.g. period on the x axis) and Filtry (every
//   dimension not on the chart, showing one value, plus the time range).
// Fields can be dropped on a well; every chip opens its members and "Przenieś do…"; an issue of a slot shows on it.

import { useId, useState, type DragEvent } from "react";
import { FAMILY_INFO } from "@zohelo/visuals";
import type { Catalog } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { geoName, kpiName, sourceName } from "../chartData";
import { Icon } from "../ui/icons";
import { filterValue, placedDims, type DimId, type Query, type Shape, type SlotKey } from "./exploreState";
import { FieldType, WellChoice, startDrag, wellName } from "./FieldList";
import { KIND_INFO, kindLabel, kindsByFamily } from "./kinds";
import { SLOTS, chartOk, fixedRole, layoutIssues, recommend, swapSlots } from "./layout";
import { DRAG_TYPE, fitWell, placePatch, removePatch, type Field, type WellKey } from "./place";
import { AreasPop, CompareOptions, MemberPop, PeriodPop, fixedName, periodText, type Patch } from "./pops";
import { PopButton } from "./PopButton";
import { dimName, memberLabel } from "./view";

const lowerFirst = (s: string, lang: Lang) => s.charAt(0).toLocaleLowerCase(lang) + s.slice(1);

type Common = { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch };

function KindIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The chart picker: every kind of the library, grouped by style family; unavailable kinds say why. */
function ChartPicker({ q, shape, lang, onPatch, recs }: Omit<Common, "cat"> & { recs: Query["chart"][] }) {
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
                  const v = chartOk(k, shape, q);
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
                      {!v.ok ? <span className="x3-kind__why">{pl ? v.reason.pl : v.reason.en}</span> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          <p className="xp-help">
            {pl
              ? "IBCS i odchylenia porównują wykonanie (AC) z tym samym okresem rok wcześniej (PY); kolor oceny tylko dla wskaźników z ustalonym kierunkiem."
              : "IBCS and variance charts compare the actual (AC) with the same period a year earlier (PY); verdict colours only for indicators with an agreed direction."}
          </p>
        </div>
      )}
    </PopButton>
  );
}

/** Members, order or period of one dimension chip (what the chip shows), as in the old query bar. */
function DimPop({ cat, q, shape, lang, onPatch, dim }: Common & { dim: DimId }) {
  if (dim === "geo") return <AreasPop cat={cat} q={q} shape={shape} lang={lang} onPatch={onPatch} />;
  if (dim === "t") return <PeriodPop q={q} shape={shape} lang={lang} onPatch={onPatch} />;
  if (dim === "i") return <IndicatorOrder cat={cat} q={q} lang={lang} onPatch={onPatch} />;
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
  if (d === "geo") return q.chart === "map" || q.chart === "choro" || q.chart === "boxplot" ? 16 : q.geo.length;
  return shape.members[d]?.length ?? 0;
}

type DragProps = { dragging: Field | null; onDrag: (f: Field | null) => void };

function Well({
  cat,
  q,
  shape,
  lang,
  onPatch,
  well,
  dragging,
  onDrag,
  children,
  issue,
  hint,
}: Common & DragProps & { well: WellKey; children: React.ReactNode; issue?: string; hint?: string }) {
  const id = useId();
  const [over, setOver] = useState(false);
  const fit = dragging ? fitWell(q, shape, cat, dragging, well, lang) : null;
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
    if (!f) return;
    const p = placePatch(q, shape, cat, f, well, lang);
    if (p) onPatch(p);
  };
  return (
    <div
      className={`x3-well${dragging ? (fit?.ok ? " is-can" : " is-cannot") : ""}${over && fit?.ok ? " is-over" : ""}${issue ? " is-bad" : ""}`}
      role="group"
      aria-labelledby={id}
      onDragOver={(e) => {
        if (!fit?.ok) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!over) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
    >
      <p className="x3-well__name" id={id}>
        {wellName(well, lang)}
      </p>
      <div className="x3-well__chips">
        {children}
        {hint ? <span className="x3-well__hint">{hint}</span> : null}
      </div>
      {dragging && fit && !fit.ok ? <p className="x3-well__why">{lang === "pl" ? fit.why.pl : fit.why.en}</p> : null}
      {issue ? <p className="xp-issue">{issue}</p> : null}
    </div>
  );
}

/** A chip of a dimension in a slot, fixed by the chart, or a filter. */
function DimChip({
  cat,
  q,
  shape,
  lang,
  onPatch,
  onDrag,
  dim,
  mode,
}: Common & { onDrag: (f: Field | null) => void; dim: DimId; mode: "slot" | "fixed" | "filter" }) {
  const pl = lang === "pl";
  const f: Field = { kind: "dim", key: dim };
  const name = dimName(cat, dim, lang);
  const n = chipCount(q, shape, dim);
  const role = fixedRole(q.chart, dim);
  const value = filterValue(q, shape, dim);
  const ms = shape.members[dim] ?? [];
  const label =
    mode === "filter"
      ? `${name}: ${value ? memberLabel(cat, dim, value, lang) : "–"}`
      : mode === "fixed" && role
        ? `${name} · ${lowerFirst(fixedName(role, lang), lang)}`
        : `${name}${n > 1 ? ` (${n})` : ""}`;
  return (
    <span className={`x3-chip x3-chip--${mode}`}>
      <PopButton
        className="x3-chip__btn"
        title={name}
        closeLabel={pl ? "Zamknij" : "Close"}
        size={dim === "geo" || dim === "t" ? "md" : "sm"}
        draggable={mode !== "fixed"}
        onDragStart={(e) => startDrag(e, f, onDrag)}
        onDragEnd={() => onDrag(null)}
        trigger={
          <>
            <FieldType f={f} />
            <span className="x3-chip__label">{label}</span>
            <Icon name="chevronDown" size={12} />
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
            {mode !== "fixed" ? (
              <>
                <p className="xp-label ex-m0">{pl ? "Przenieś do" : "Move to"}</p>
                <WellChoice cat={cat} q={q} shape={shape} lang={lang} f={f} onPatch={onPatch} close={close} />
              </>
            ) : (
              <p className="xp-help">
                {pl
                  ? "Ten typ wykresu sam umieszcza to pole; zmień typ, aby je przenieść."
                  : "This chart type places this field itself; change the type to move it."}
              </p>
            )}
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
            <Icon name="chevronDown" size={12} />
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
        <span className="zt-sr">{pl ? `Usuń wskaźnik: ${name}` : `Remove indicator: ${name}`}</span>
      </button>
    </span>
  );
}

export function Wells({ cat, q, shape, lang, onPatch, dragging, onDrag }: Common & DragProps) {
  const pl = lang === "pl";
  const common = { cat, q, shape, lang, onPatch };
  const issues = layoutIssues(q, shape);
  const recs = q.i.length ? recommend(shape, q) : [];
  const slots = SLOTS[q.chart];
  const placed = placedDims(q, shape);
  const dims: DimId[] = ["i", "geo", "t", ...shape.shared].filter((d) => (shape.members[d]?.length ?? 0) > 0);
  const fixed = dims.filter((d) => fixedRole(q.chart, d));
  const filters = dims.filter((d) => !placed.has(d) && !(d === "i" && q.i.length < 2));
  const swap = swapSlots(q);
  return (
    <section className="x3-wells" aria-label={pl ? "Wykres: typ i pola" : "Chart: type and fields"}>
      <div className="x3-wells__top">
        <ChartPicker q={q} shape={shape} lang={lang} onPatch={onPatch} recs={recs} />
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
        {swap && slots.length === 2 && q.slots[slots[0]!] && q.slots[slots[1]!] ? (
          <button type="button" className="zt-btn zt-btn--ghost x3-swap" onClick={() => onPatch({ slots: swap })}>
            ⇄ {pl ? "Zamień" : "Swap"} {wellName(slots[0]!, lang).toLocaleLowerCase(lang)} ↔{" "}
            {wellName(slots[1]!, lang).toLocaleLowerCase(lang)}
          </button>
        ) : null}
      </div>
      <div className="x3-wells__grid">
        <Well
          {...common}
          well="values"
          dragging={dragging}
          onDrag={onDrag}
          hint={q.i.length ? undefined : pl ? "Upuść wskaźnik albo kliknij go w polach" : "Drop an indicator or click it in the fields"}
        >
          {q.i.map((k) => (
            <ValueChip key={k} {...common} onDrag={onDrag} kpi={k} />
          ))}
        </Well>
        {slots.map((s: SlotKey) => {
          const d = q.slots[s];
          const issue = issues[s];
          return (
            <Well
              key={s}
              {...common}
              well={s}
              dragging={dragging}
              onDrag={onDrag}
              issue={issue ? (pl ? issue.pl : issue.en) : undefined}
              hint={d ? undefined : pl ? "Upuść wymiar" : "Drop a dimension"}
            >
              {d ? <DimChip {...common} onDrag={onDrag} dim={d} mode="slot" /> : null}
            </Well>
          );
        })}
        <Well {...common} well="filters" dragging={dragging} onDrag={onDrag}>
          <span className="x3-chip x3-chip--filter">
            <PopButton
              className="x3-chip__btn"
              title={pl ? "Zakres czasu" : "Time range"}
              closeLabel={pl ? "Zamknij" : "Close"}
              trigger={
                <>
                  <FieldType f={{ kind: "dim", key: "t" }} />
                  <span className="x3-chip__label">
                    {pl ? "Zakres: " : "Range: "}
                    {q.i.length ? periodText(q, shape, lang) : "–"}
                  </span>
                  <Icon name="chevronDown" size={12} />
                </>
              }
            >
              <PeriodPop q={q} shape={shape} lang={lang} onPatch={onPatch} />
            </PopButton>
          </span>
          {filters.map((d) => (
            <DimChip key={d} {...common} onDrag={onDrag} dim={d} mode="filter" />
          ))}
        </Well>
      </div>
      {fixed.length ? (
        <div className="x3-fixed">
          <span className="small x3-fixed__label">{pl ? "Ustalone przez wykres:" : "Placed by the chart:"}</span>
          {fixed.map((d) => (
            <DimChip key={d} {...common} onDrag={onDrag} dim={d} mode="fixed" />
          ))}
          {q.chart === "map" || q.chart === "choro" || q.chart === "boxplot" ? (
            q.geo.length === 1 && q.geo[0] !== "PL" ? (
              <span className="small x3-fixed__note">
                {pl ? "wyróżnione" : "highlighted"}: {geoName(cat, q.geo[0]!, lang)}
              </span>
            ) : null
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
