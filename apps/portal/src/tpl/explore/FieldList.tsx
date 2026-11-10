// Pola (field list) of the explorer, the left zone (Power BI field list, Analysis Services dimensions):
//   search · Miary (collapsed by default): measures grouped domain → group, each a toggle to "Wartości", plus
//   "Nazwy miar" when there are several · Wymiary (collapsed by default): one table per dimension — Kalendarz
//   (Rok → Kwartał → Miesiąc, Miesiąc roku, Kwartał roku), Geografia (Kraj → Województwo), every breakdown —
//   each collapsible, with "+" for the whole dimension (a hierarchy can be drilled on the chart) and a row per
//   level with "+", a "Dodaj do…" menu and drag. With no measure every dimension is offered; with measures, the
//   union of their dimensions. Click and keyboard do everything drag does (WCAG 2.5.7).

import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import type { Catalog, Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { kpiName } from "../chartData";
import { freqLabel } from "../format";
import { Icon, domainIcon } from "../ui/icons";
import { MAX_KPIS, type Query, type Shape } from "./exploreState";
import { hasVoivodeships } from "./kpiInfo";
import { PopButton } from "./PopButton";
import { DRAG_TYPE, fitWell, missingIn, placePatch, removePatch, sensibleWell, wellOf, wellsOf, type Field, type WellKey } from "./place";
import { slotName, type Patch } from "./pops";
import { plural, searchDocs, searchKpis } from "./search";
import { dimGroups, type DimGroup, type Level } from "./model";
import { kpisOf } from "./exploreState";

export function wellName(w: WellKey, lang: Lang, q?: Pick<Query, "chart">): string {
  const pl = lang === "pl";
  if (w === "values") return pl ? "Wartości" : "Values";
  if (w === "filters") return pl ? "Filtry" : "Filters";
  return slotName(w, lang, q?.chart);
}

/** Type icon of a field: Σ measure, a clock for time, a pin for geography, a grid for a dimension. */
const TYPE_PATH = {
  t: "M8 14.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13zM8 4.5V8l2.5 1.5",
  g: "M8 14.5s-4.5-4.2-4.5-7.5a4.5 4.5 0 019 0c0 3.3-4.5 7.5-4.5 7.5zM8 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  d: "M2.5 2.5h4.5v4.5H2.5zM9 2.5h4.5v4.5H9zM2.5 9h4.5v4.5H2.5zM9 9h4.5v4.5H9z",
  h: "M3 3h4v3H3zM7 4.5h3M10 3h3v3h-3zM11.5 6v3M10 9h3v3h-3z",
};

export function FieldType({ f }: { f: Field }) {
  const kind =
    f.kind === "kpi"
      ? "m"
      : f.kind === "names"
        ? "n"
        : f.kind === "dim" && f.hier
          ? "h"
          : f.key.startsWith("t")
            ? "t"
            : f.key === "geo"
              ? "g"
              : "d";
  return (
    <span className={`x3-type x3-type--${kind}`} aria-hidden="true">
      {kind === "m" ? (
        "Σ"
      ) : kind === "n" ? (
        "Σ…"
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

type RowProps = { cat: Catalog; q: Query; shape: Shape; lang: Lang; onPatch: Patch; onDrag: (f: Field | null) => void };

/** Whether this level is the one on the chart (same well, same level). */
function levelOn(q: Query, shape: Shape, f: Field): boolean {
  if (f.kind !== "dim") return !!wellOf(q, f);
  if (!wellOf(q, f)) return false;
  if (f.hier) return q.hier.includes(f.key);
  if (f.grain) return shape.grain === f.grain && !q.hier.includes("t");
  if (f.level) return q.level === f.level && !q.hier.includes("geo");
  return true;
}

/** One field: name (menu "Dodaj do…", draggable), its state, and "+" to the sensible well. */
function FieldRow({
  f,
  name,
  note,
  cat,
  q,
  shape,
  lang,
  onPatch,
  onDrag,
  head,
}: RowProps & { f: Field; name: string; note?: string; head?: ReactNode }) {
  const pl = lang === "pl";
  const lack = f.kind === "dim" ? missingIn(shape.kpis, f.key) : [];
  const on = levelOn(q, shape, f);
  const placed = wellOf(q, f);
  const target = sensibleWell(q, shape, cat, f);
  const state = on
    ? `${pl ? "w" : "in"}: ${wellName(placed!, lang, q)}`
    : lack.length && q.i.length
      ? pl
        ? `bez podziału: ${lack.map((k) => kpiName(k, lang)).join(", ")}`
        : `not in: ${lack.map((k) => kpiName(k, lang)).join(", ")}`
      : (note ?? "");
  return (
    <li className={`x3-field x3-field--dim${on ? " is-on" : ""}`}>
      {head}
      <PopButton
        className="x3-field__main"
        title={pl ? `Dodaj „${name}” do…` : `Add “${name}” to…`}
        closeLabel={pl ? "Zamknij" : "Close"}
        size="sm"
        draggable
        onDragStart={(e) => startDrag(e, f, onDrag)}
        onDragEnd={() => onDrag(null)}
        trigger={
          <>
            <FieldType f={f} />
            <span className="x3-field__text">
              <span className="x3-field__name">{name}</span>
              {state ? <span className="x3-field__meta">{state}</span> : null}
            </span>
          </>
        }
      >
        {(close) => <WellChoice cat={cat} q={q} shape={shape} lang={lang} f={f} onPatch={onPatch} close={close} />}
      </PopButton>
      {target && !on ? (
        <button
          type="button"
          className="x3-add"
          onClick={() => {
            const p = placePatch(q, shape, cat, f, target);
            if (p) onPatch(p);
          }}
        >
          +
          <span className="zt-sr">
            {" "}
            {pl ? `Dodaj „${name}” do: ${wellName(target, lang, q)}` : `Add “${name}” to: ${wellName(target, lang, q)}`}
          </span>
        </button>
      ) : null}
    </li>
  );
}

/** Every well of the chart for one field: buttons where it fits, the reason where it does not. */
export function WellChoice({ cat, q, shape, lang, f, onPatch, close }: Omit<RowProps, "onDrag"> & { f: Field; close: () => void }) {
  const pl = lang === "pl";
  const at = wellOf(q, f);
  const same = levelOn(q, shape, f);
  return (
    <ul className="x3-choice">
      {wellsOf(q).map((w) => {
        const fit = fitWell(q, shape, cat, f, w);
        const here = (at === w && same) || (w === "filters" && f.kind !== "kpi" && !at);
        return (
          <li key={w}>
            {fit.ok && !here ? (
              <button
                type="button"
                className="x3-choice__btn"
                onClick={() => {
                  const p = placePatch(q, shape, cat, f, w);
                  if (p) onPatch(p);
                  close();
                }}
              >
                {wellName(w, lang, q)}
              </button>
            ) : (
              <span className="x3-choice__off">
                <span className="x3-choice__name">{wellName(w, lang, q)}</span>
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

/** A section or group heading that expands and collapses (aria-expanded), with an optional count. */
function Toggle({
  id,
  open,
  onFlip,
  children,
  count,
  level,
}: {
  id: string;
  open: boolean;
  onFlip: () => void;
  children: ReactNode;
  count?: ReactNode;
  level: "section" | "group";
}) {
  return (
    <button type="button" className={`x3-node x3-node--${level}`} aria-expanded={open} data-node={id} onClick={onFlip}>
      <Icon name="chevronRight" size={12} className="x3-node__chev" />
      <span className="x3-node__name">{children}</span>
      {count !== undefined ? <span className="x3-field__n">{count}</span> : null}
    </button>
  );
}

function DimGroupRows({ g, open, flip, ...p }: RowProps & { g: DimGroup; open: Set<string>; flip: (key: string, on: boolean) => void }) {
  const pl = p.lang === "pl";
  const key = `§g:${g.key}`;
  const isOpen = open.has(key);
  const name = pl ? g.pl : g.en;
  const whole: Field = { kind: "dim", key: g.dim, ...(g.hierarchy ? { hier: true } : {}) };
  const placedWhole = g.hierarchy ? p.q.hier.includes(g.dim) && !!wellOf(p.q, whole) : !!wellOf(p.q, whole);
  const target = sensibleWell(p.q, p.shape, p.cat, whole);
  const icon = g.key === "cal" ? "t" : g.key === "geo" ? "g" : "d";
  return (
    <li className="x3-dimgroup">
      <div className="x3-dimgroup__head">
        <Toggle
          id={key}
          open={isOpen}
          onFlip={() => flip(key, !isOpen)}
          level="group"
          count={g.levels.length > 1 ? g.levels.length : undefined}
        >
          <span className={`x3-type x3-type--${icon} x3-type--sm`} aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 16 16" focusable="false">
              <path d={TYPE_PATH[icon]} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </span>
          {name}
          {placedWhole ? <span className="x3-field__meta"> · {pl ? "na wykresie" : "on the chart"}</span> : null}
        </Toggle>
        {target && !placedWhole ? (
          <button
            type="button"
            className="x3-add"
            draggable
            onDragStart={(e) => startDrag(e, whole, p.onDrag)}
            onDragEnd={() => p.onDrag(null)}
            onClick={() => {
              const patch = placePatch(p.q, p.shape, p.cat, whole, target);
              if (patch) p.onPatch(patch);
            }}
          >
            +
            <span className="zt-sr">
              {" "}
              {g.hierarchy
                ? pl
                  ? `Dodaj hierarchię „${name}” do: ${wellName(target, p.lang, p.q)}`
                  : `Add the “${name}” hierarchy to: ${wellName(target, p.lang, p.q)}`
                : pl
                  ? `Dodaj „${name}” do: ${wellName(target, p.lang, p.q)}`
                  : `Add “${name}” to: ${wellName(target, p.lang, p.q)}`}
            </span>
          </button>
        ) : null}
      </div>
      {isOpen ? (
        <>
          <p className="x3-dimgroup__note">{pl ? g.notePl : g.noteEn}</p>
          <ul className="x3-list x3-dimgroup__levels">
            {g.levels.map((l: Level) => {
              const f: Field = { kind: "dim", key: l.dim, ...(l.grain ? { grain: l.grain } : {}), ...(l.geo ? { level: l.geo } : {}) };
              return <FieldRow key={l.id} f={f} name={pl ? l.pl : l.en} {...p} />;
            })}
          </ul>
        </>
      ) : null}
    </li>
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
}: RowProps & {
  /** Open sections, domains, groups and dimension tables (kept by the page, so the catalogue panel can open one). */
  open: Set<string>;
  setOpen: (s: Set<string>) => void;
}) {
  const pl = lang === "pl";
  const [text, setText] = useState("");
  const docs = useMemo(() => searchDocs(cat), [cat]);
  const t = text.trim();
  const hits = t ? searchKpis(docs, text).slice(0, 40) : [];
  const limit = q.i.length >= MAX_KPIS;
  const toggle = (k: Kpi) => {
    if (q.i.includes(k.kpi_key)) return onPatch(removePatch(q, { kind: "kpi", key: k.kpi_key }));
    const p = placePatch(q, shape, cat, { kind: "kpi", key: k.kpi_key }, "values");
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
  const groups = dimGroups(cat, kpisOf(cat, q.i)).filter(
    (g) => !t || (pl ? g.pl : g.en).toLocaleLowerCase(lang).includes(t.toLocaleLowerCase(lang)),
  );
  const mOpen = open.has("§m") || !!t;
  const dOpen = open.has("§d") || (!!t && groups.length > 0);
  const row = { cat, q, shape, lang, onPatch, onDrag };
  return (
    <div className="x3-fields">
      <label className="zt-search x3-find">
        <Icon name="search" size={16} />
        <span className="zt-sr">{pl ? "Szukaj pól: miar i wymiarów" : "Search fields: measures and dimensions"}</span>
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
          {pl ? `Limit ${MAX_KPIS} miar: usuń jedną, aby dodać kolejną.` : `Limit of ${MAX_KPIS} measures: remove one to add another.`}
        </p>
      ) : null}

      <h3 className="x3-fields__h">
        <Toggle
          id="§m"
          open={mOpen}
          onFlip={() => flip("§m", !mOpen)}
          level="section"
          count={q.i.length ? `${q.i.length} / ${cat.kpis.length}` : cat.kpis.length}
        >
          {pl ? "Miary" : "Measures"}
        </Toggle>
      </h3>
      {mOpen ? (
        t ? (
          <ul className="x3-list" aria-label={pl ? "Miary: wyniki wyszukiwania" : "Measures: search results"}>
            {hits.map((k) => (
              <KpiRow key={k.kpi_key} k={k} q={q} lang={lang} limit={limit} onToggle={() => toggle(k)} onDrag={onDrag} />
            ))}
            {!hits.length ? <li className="x3-note">{pl ? "Brak miar dla tego zapytania." : "No measures match."}</li> : null}
          </ul>
        ) : (
          <ul className="x3-tree" aria-label={pl ? "Miary według tematów" : "Measures by topic"}>
            {domains.map((d) => {
              const gs = cat.domains.filter((g) => g.parent_key === d.domain_key && g.level === "group").sort((a, b) => a.sort - b.sort);
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
                      {gs.map((g) => {
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
                                  <KpiRow
                                    key={k.kpi_key}
                                    k={k}
                                    q={q}
                                    lang={lang}
                                    limit={limit}
                                    onToggle={() => toggle(k)}
                                    onDrag={onDrag}
                                  />
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
        )
      ) : null}
      {q.i.length > 1 ? (
        <ul className="x3-list">
          <FieldRow
            f={{ kind: "names", key: "i" }}
            name={pl ? "Nazwy miar" : "Measure names"}
            note={pl ? "miary jako seria, oś lub panele" : "measures as series, axis or panels"}
            {...row}
          />
        </ul>
      ) : null}

      <h3 className="x3-fields__h">
        <Toggle id="§d" open={dOpen} onFlip={() => flip("§d", !dOpen)} level="section" count={groups.length}>
          {pl ? "Wymiary" : "Dimensions"}
        </Toggle>
      </h3>
      {dOpen ? (
        <>
          <p className="x3-note">
            {q.i.length
              ? pl
                ? `Wymiary wybranych miar (${q.i.length} ${plural(q.i.length, lang, ["miara", "miary", "miar"], ["measure", "measures"])}).`
                : `Dimensions of the chosen measures.`
              : pl
                ? "Wszystkie wymiary katalogu; po wyborze miar zostaną ich wymiary."
                : "Every dimension of the catalogue; with measures chosen, their dimensions."}
          </p>
          {/* Time and place first, then the breakdowns under their own heading (review 2026-11-09). */}
          <ul className="x3-tree" aria-label={pl ? "Czas i miejsce" : "Time and place"}>
            {groups
              .filter((g) => g.key === "cal" || g.key === "geo")
              .map((g) => (
                <DimGroupRows key={g.key} g={g} open={open} flip={flip} {...row} />
              ))}
          </ul>
          {groups.some((g) => g.key !== "cal" && g.key !== "geo") ? (
            <>
              <p className="x3-subh">
                {pl ? "Podziały" : "Breakdowns"} ({groups.filter((g) => g.key !== "cal" && g.key !== "geo").length})
              </p>
              <ul className="x3-tree" aria-label={pl ? "Podziały" : "Breakdowns"}>
                {groups
                  .filter((g) => g.key !== "cal" && g.key !== "geo")
                  .map((g) => (
                    <DimGroupRows key={g.key} g={g} open={open} flip={flip} {...row} />
                  ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
      {!mOpen && !q.i.length ? (
        <p className="x3-note">
          {pl ? "Otwórz „Miary” i kliknij miarę, aby dodać ją do „Wartości”." : "Open “Measures” and click one to add it to “Values”."}
        </p>
      ) : null}
    </div>
  );
}
