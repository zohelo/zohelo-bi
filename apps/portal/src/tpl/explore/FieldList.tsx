// Pola (field list) of explorer v3, the left zone (Power BI field list): search; indicators (measures) grouped
// domain → group, each a toggle that adds it to "Wartości"; dimensions (area, period, breakdowns) with a type icon,
// "+" to the sensible well and a "Dodaj do…" menu listing every well (unavailable ones with the reason). Every row
// can also be dragged onto a well; click and keyboard do everything drag does (WCAG 2.5.7).

import { useMemo, useState, type DragEvent } from "react";
import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { kpiName } from "../chartData";
import { freqLabel } from "../format";
import { Icon, domainIcon } from "../ui/icons";
import { MAX_KPIS, type DimId, type Query, type Shape } from "./exploreState";
import { hasVoivodeships, unitName } from "./kpiInfo";
import { PopButton } from "./PopButton";
import {
  DRAG_TYPE,
  dimFields,
  fitWell,
  missingIn,
  placePatch,
  removePatch,
  sensibleWell,
  wellOf,
  wellsOf,
  type Field,
  type WellKey,
} from "./place";
import { slotName, type Patch } from "./pops";
import { plural, searchDocs, searchKpis } from "./search";
import { dimName } from "./view";

export function wellName(w: WellKey, lang: Lang): string {
  const pl = lang === "pl";
  if (w === "values") return pl ? "Wartości" : "Values";
  if (w === "filters") return pl ? "Filtry" : "Filters";
  return slotName(w, lang);
}

/** Type icon of a field: Σ measure, a clock for time, a grid for a dimension. */
const TYPE_PATH = {
  t: "M8 14.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM8 4.5V8l2.5 1.5",
  g: "M8 14.5s-4.5-4.2-4.5-7.5a4.5 4.5 0 019 0c0 3.3-4.5 7.5-4.5 7.5zM8 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  d: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
};

export function FieldType({ f }: { f: Field }) {
  const kind = f.kind === "kpi" ? "m" : f.key === "t" ? "t" : f.key === "geo" ? "g" : "d";
  return (
    <span className={`x3-type x3-type--${kind}`} aria-hidden="true">
      {kind === "m" ? (
        "Σ"
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" focusable="false">
          <path d={TYPE_PATH[kind]} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

export function startDrag(e: DragEvent<HTMLElement>, f: Field, onDrag: (f: Field | null) => void) {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(f));
  e.dataTransfer.setData("text/plain", f.key);
  e.dataTransfer.effectAllowed = "move";
  onDrag(f);
}

function KpiRow({
  k,
  q,
  lang,
  limit,
  onToggle,
  onDrag,
}: {
  k: Kpi;
  q: Query;
  lang: Lang;
  limit: boolean;
  onToggle: () => void;
  onDrag: (f: Field | null) => void;
}) {
  const on = q.i.includes(k.kpi_key);
  const scope = hasVoivodeships(k) ? (lang === "pl" ? "woj." : "reg.") : k.geographies.length > 1 ? (lang === "pl" ? "UE" : "EU") : "PL";
  return (
    <li className={`x3-field${on ? " is-on" : ""}`}>
      <button
        type="button"
        className="x3-field__main"
        aria-pressed={on}
        disabled={!on && limit}
        draggable={!on}
        onDragStart={(e) => startDrag(e, { kind: "kpi", key: k.kpi_key }, onDrag)}
        onDragEnd={() => onDrag(null)}
        onClick={onToggle}
      >
        <FieldType f={{ kind: "kpi", key: k.kpi_key }} />
        <span className="x3-field__text">
          <span className="x3-field__name">{kpiName(k, lang)}</span>
          <span className="x3-field__meta">
            {freqLabel(k.frequency, lang)} · {scope}
          </span>
        </span>
        {on ? <Icon name="close" size={12} className="x3-field__state" /> : <span className="x3-field__plus">+</span>}
      </button>
    </li>
  );
}

function DimRow({
  cat,
  q,
  shape,
  lang,
  dim,
  onPatch,
  onDrag,
}: {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  dim: DimId;
  onPatch: Patch;
  onDrag: (f: Field | null) => void;
}) {
  const pl = lang === "pl";
  const f: Field = { kind: "dim", key: dim };
  const name = dimName(cat, dim, lang);
  const lack = missingIn(shape.kpis, dim);
  const placed = wellOf(q, f);
  const target = sensibleWell(q, shape, cat, f, lang);
  const members =
    dim === "geo" ? q.geo.length : dim === "t" ? shape.periods.length : dim === "i" ? q.i.length : (shape.members[dim]?.length ?? 0);
  const n = cat.dimensions.find((d) => d.dimension_key === dim)?.members.length;
  const state = !q.i.length
    ? ""
    : lack.length
      ? pl
        ? `brak w: ${lack.map((k) => kpiName(k, lang)).join(", ")}`
        : `missing in: ${lack.map((k) => kpiName(k, lang)).join(", ")}`
      : placed
        ? `${pl ? "w" : "in"}: ${wellName(placed, lang)}`
        : `${pl ? "filtr" : "filter"} · ${members}`;
  const off = !q.i.length || lack.length > 0;
  return (
    <li className={`x3-field x3-field--dim${placed ? " is-on" : ""}${off ? " is-off" : ""}`}>
      <PopButton
        className="x3-field__main"
        title={pl ? `Dodaj „${name}” do…` : `Add “${name}” to…`}
        closeLabel={pl ? "Zamknij" : "Close"}
        size="sm"
        draggable={!off}
        onDragStart={(e) => startDrag(e, f, onDrag)}
        onDragEnd={() => onDrag(null)}
        trigger={
          <>
            <FieldType f={f} />
            <span className="x3-field__text">
              <span className="x3-field__name">
                {name}
                {n && dim !== "geo" && dim !== "t" ? <span className="x3-field__n"> ({n})</span> : null}
              </span>
              {state ? <span className="x3-field__meta">{state}</span> : null}
            </span>
          </>
        }
      >
        {(close) => <WellChoice cat={cat} q={q} shape={shape} lang={lang} f={f} onPatch={onPatch} close={close} />}
      </PopButton>
      {target && !off ? (
        <button
          type="button"
          className="x3-add"
          onClick={() => {
            const p = placePatch(q, shape, cat, f, target, lang);
            if (p) onPatch(p);
          }}
        >
          +
          <span className="zt-sr">
            {" "}
            {pl ? `Dodaj „${name}” do: ${wellName(target, lang)}` : `Add “${name}” to: ${wellName(target, lang)}`}
          </span>
        </button>
      ) : null}
    </li>
  );
}

/** Every well of the chart for one field: buttons where it fits, the reason where it does not. */
export function WellChoice({
  cat,
  q,
  shape,
  lang,
  f,
  onPatch,
  close,
}: {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  f: Field;
  onPatch: Patch;
  close: () => void;
}) {
  const pl = lang === "pl";
  const at = wellOf(q, f);
  return (
    <ul className="x3-choice">
      {wellsOf(q).map((w) => {
        const fit = fitWell(q, shape, cat, f, w, lang);
        const here = at === w || (w === "filters" && f.kind === "dim" && !at);
        return (
          <li key={w}>
            {fit.ok && !here ? (
              <button
                type="button"
                className="x3-choice__btn"
                onClick={() => {
                  const p = placePatch(q, shape, cat, f, w, lang);
                  if (p) onPatch(p);
                  close();
                }}
              >
                {wellName(w, lang)}
              </button>
            ) : (
              <span className="x3-choice__off">
                <span className="x3-choice__name">{wellName(w, lang)}</span>
                <span className="x3-choice__why">
                  {here ? (pl ? "tutaj jest teraz" : "it is here now") : !fit.ok ? (pl ? fit.why.pl : fit.why.en) : ""}
                </span>
              </span>
            )}
          </li>
        );
      })}
      {at && at !== "values" ? (
        <li>
          <button
            type="button"
            className="x3-choice__btn x3-choice__btn--quiet"
            onClick={() => {
              onPatch(removePatch(q, f));
              close();
            }}
          >
            {pl ? "Zdejmij z wykresu (zostaje filtrem)" : "Take off the chart (stays a filter)"}
          </button>
        </li>
      ) : null}
    </ul>
  );
}

export function FieldList({
  cat,
  q,
  shape,
  lang,
  onPatch,
  onDrag,
  open,
  setOpen,
}: {
  cat: Catalog;
  q: Query;
  shape: Shape;
  lang: Lang;
  onPatch: Patch;
  onDrag: (f: Field | null) => void;
  /** Open domain and group nodes of the tree (kept by the page, so the catalogue panel can open one). */
  open: Set<string>;
  setOpen: (s: Set<string>) => void;
}) {
  const pl = lang === "pl";
  const [text, setText] = useState("");
  const docs = useMemo(() => searchDocs(cat), [cat]);
  const hits = text.trim() ? searchKpis(docs, text).slice(0, 40) : [];
  const limit = q.i.length >= MAX_KPIS;
  const toggle = (k: Kpi) => {
    if (q.i.includes(k.kpi_key)) return onPatch(removePatch(q, { kind: "kpi", key: k.kpi_key }));
    const p = placePatch(q, shape, cat, { kind: "kpi", key: k.kpi_key }, "values", lang);
    if (p) onPatch(p);
  };
  const domains = cat.domains.filter((d) => d.level === "domain").sort((a, b) => a.sort - b.sort);
  const name = (x: { name_pl: string; name_en: string }) => (pl ? x.name_pl : x.name_en);
  const flip = (key: string, on: boolean) => {
    const next = new Set(open);
    if (on) next.add(key);
    else next.delete(key);
    setOpen(next);
  };
  const dims = dimFields(cat, q).filter(
    (d) => !text.trim() || dimName(cat, d, lang).toLocaleLowerCase(lang).includes(text.trim().toLocaleLowerCase(lang)),
  );
  return (
    <div className="x3-fields">
      <label className="zt-search x3-find">
        <Icon name="search" size={16} />
        <span className="zt-sr">{pl ? "Szukaj pól: wskaźników i wymiarów" : "Search fields: indicators and dimensions"}</span>
        <input
          type="search"
          value={text}
          autoComplete="off"
          placeholder={pl ? "Szukaj pól" : "Search fields"}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      {limit ? (
        <p className="x3-note">
          {pl
            ? `Limit ${MAX_KPIS} wskaźników: usuń jeden, aby dodać kolejny.`
            : `Limit of ${MAX_KPIS} indicators: remove one to add another.`}
        </p>
      ) : null}

      <h3 className="x3-fields__h" id="x3-measures">
        {pl ? "Wskaźniki (miary)" : "Indicators (measures)"} <span className="x3-field__n">{cat.kpis.length}</span>
      </h3>
      {text.trim() ? (
        <ul className="x3-list" aria-labelledby="x3-measures">
          {hits.map((k) => (
            <KpiRow key={k.kpi_key} k={k} q={q} lang={lang} limit={limit} onToggle={() => toggle(k)} onDrag={onDrag} />
          ))}
          {!hits.length ? <li className="x3-note">{pl ? "Brak wskaźników dla tego zapytania." : "No indicators match."}</li> : null}
        </ul>
      ) : (
        <ul className="x3-tree" aria-labelledby="x3-measures">
          {domains.map((d) => {
            const groups = cat.domains.filter((g) => g.parent_key === d.domain_key && g.level === "group").sort((a, b) => a.sort - b.sort);
            const nSel = q.i.filter((k) => cat.kpis.find((x) => x.kpi_key === k)?.domain_key === d.domain_key).length;
            const isOpen = open.has(d.domain_key);
            return (
              <li key={d.domain_key}>
                <button
                  type="button"
                  className="x3-node"
                  data-node={d.domain_key}
                  aria-expanded={isOpen}
                  onClick={() => flip(d.domain_key, !isOpen)}
                >
                  <Icon name="chevronRight" size={12} className="x3-node__chev" />
                  <Icon name={domainIcon(d.domain_key)} size={14} />
                  <span className="x3-node__name">{name(d)}</span>
                  <span className="x3-field__n">
                    {nSel ? `${nSel} / ` : ""}
                    {cat.kpis.filter((k) => k.domain_key === d.domain_key).length}
                  </span>
                </button>
                {isOpen ? (
                  <ul className="x3-tree__groups">
                    {groups.map((g) => {
                      const kpis = cat.kpis.filter((k) => k.group_key === g.domain_key);
                      const gOpen = open.has(g.domain_key);
                      if (!kpis.length) return null;
                      return (
                        <li key={g.domain_key}>
                          <button
                            type="button"
                            className="x3-node x3-node--group"
                            aria-expanded={gOpen}
                            onClick={() => flip(g.domain_key, !gOpen)}
                          >
                            <Icon name="chevronRight" size={12} className="x3-node__chev" />
                            <span className="x3-node__name">{name(g)}</span>
                            <span className="x3-field__n">{kpis.length}</span>
                          </button>
                          {gOpen ? (
                            <ul className="x3-list">
                              {kpis.map((k) => (
                                <KpiRow key={k.kpi_key} k={k} q={q} lang={lang} limit={limit} onToggle={() => toggle(k)} onDrag={onDrag} />
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="x3-fields__h" id="x3-dims">
        {pl ? "Wymiary" : "Dimensions"}
      </h3>
      {!q.i.length ? (
        <p className="x3-note">{pl ? "Wymiary zależą od wybranych wskaźników." : "Dimensions depend on the chosen indicators."}</p>
      ) : null}
      <ul className="x3-list" aria-labelledby="x3-dims">
        {dims.map((d) => (
          <DimRow key={d} cat={cat} q={q} shape={shape} lang={lang} dim={d} onPatch={onPatch} onDrag={onDrag} />
        ))}
      </ul>

      <h3 className="x3-fields__h">{pl ? "Atrybuty" : "Attributes"}</h3>
      <dl className="x3-attrs">
        <div>
          <dt>{pl ? "Częstotliwość widoku" : "View frequency"}</dt>
          <dd>
            {q.i.length
              ? `${freqLabel(shape.freq, lang)}${shape.mixed ? (pl ? " (najrzadsza z wybranych)" : " (coarsest of the chosen)") : ""}`
              : "–"}
          </dd>
        </div>
        <div>
          <dt>{pl ? "Jednostki" : "Units"}</dt>
          <dd>{q.i.length ? [...new Set(shape.kpis.map((k) => unitName(cat, k.unit_key, lang)))].join("; ") : "–"}</dd>
        </div>
        <div>
          <dt>{pl ? "Źródło" : "Source"}</dt>
          <dd>{pl ? "wybór źródła w chipie wskaźnika (Wartości)" : "choose the source on the indicator chip (Values)"}</dd>
        </div>
      </dl>
      <p className="x3-note">
        {q.i.length
          ? `${q.i.length} ${plural(q.i.length, lang, ["wskaźnik", "wskaźniki", "wskaźników"], ["indicator", "indicators"])} · ${pl ? "przeciągnij pole na wykres albo użyj +" : "drag a field onto the chart or use +"}`
          : pl
            ? "Kliknij wskaźnik, aby dodać go do „Wartości”."
            : "Click an indicator to add it to “Values”."}
      </p>
    </div>
  );
}
