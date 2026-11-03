// Step 1 of the explorer panel: search-first combobox over the catalogue (WAI-ARIA APG combobox with a listbox
// popup: type to filter, arrows move the active option, Enter adds, Esc closes then clears) and the selected
// indicators as an ordered list with unit badge, source, move up/down and remove. Results that do not fit the
// selection are marked with the reason instead of hidden.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Lang } from "../../i18n";
import type { Catalog, Kpi } from "../../data";
import { kpiName, sourceName } from "../chartData";
import { freqLabel } from "../format";
import { Icon } from "../ui/icons";
import { MAX_KPIS, kpisOf, sourceOf, type Query } from "./exploreState";
import { domainOf, hasVoivodeships, nameOf, unitName } from "./kpiInfo";
import { plural, searchDocs, searchKpis } from "./search";

const MAX_HITS = 40;

type Fit = { blocked: boolean; text: string } | null;

/** Why a result does not fit the current selection (blocked = cannot be added). */
export function fitOf(k: Kpi, chosen: Kpi[], q: Pick<Query, "level">, lang: Lang): Fit {
  const pl = lang === "pl";
  if (chosen.some((c) => c.kpi_key === k.kpi_key)) return { blocked: true, text: pl ? "Już wybrany" : "Already selected" };
  if (chosen.length >= MAX_KPIS) return { blocked: true, text: pl ? `Limit ${MAX_KPIS} wskaźników` : `Limit of ${MAX_KPIS} indicators` };
  if (q.level === "voivodeship" && !hasVoivodeships(k))
    return { blocked: false, text: pl ? "Brak województw: poziom zmieni się na kraje" : "No voivodeships: level switches to countries" };
  const f = chosen[0]?.frequency;
  if (f && k.frequency !== f)
    return {
      blocked: false,
      text: pl
        ? `${freqLabel(k.frequency, lang)}: wartości zostaną uśrednione do wspólnej częstotliwości`
        : `${freqLabel(k.frequency, lang)}: values will be averaged to a common frequency`,
    };
  return null;
}

export function IndicatorPicker({
  cat,
  q,
  lang,
  onAdd,
  onMove,
  onRemove,
  onSource,
}: {
  cat: Catalog;
  q: Query;
  lang: Lang;
  onAdd: (key: string) => void;
  onMove: (key: string, by: -1 | 1) => void;
  onRemove: (key: string) => void;
  onSource: (key: string, source: string) => void;
}) {
  const pl = lang === "pl";
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const ids = { input: useId(), list: useId(), help: useId() };
  const docs = useMemo(() => searchDocs(cat), [cat]);
  const hits = useMemo(() => searchKpis(docs, text).slice(0, MAX_HITS), [docs, text]);
  const chosen = kpisOf(cat, q.i);
  const fits = hits.map((k) => fitOf(k, chosen, q, lang));
  const at = Math.min(active, Math.max(0, hits.length - 1));
  useEffect(() => {
    if (open) document.getElementById(`${ids.list}-${at}`)?.scrollIntoView({ block: "nearest" });
  }, [open, at, ids.list]);

  const add = (i: number) => {
    const k = hits[i];
    if (!k || fits[i]?.blocked) return;
    onAdd(k.kpi_key);
    setText("");
    setActive(0);
    setOpen(false);
  };

  return (
    <div className="xp-ind">
      <label className="xp-label" htmlFor={ids.input}>
        {pl ? "Szukaj wskaźnika" : "Search indicators"}
      </label>
      <div className="xp-combo">
        <div className="zt-search xp-combo__field">
          <Icon name="search" />
          <input
            ref={input}
            id={ids.input}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={ids.list}
            aria-describedby={ids.help}
            aria-activedescendant={open && hits.length ? `${ids.list}-${at}` : undefined}
            placeholder={pl ? "np. bezrobocie, wynagrodzenie" : "e.g. unemployment, wages"}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setActive(0);
              setOpen(true);
            }}
            onClick={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!open) setOpen(true);
                else setActive(Math.min(hits.length - 1, at + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive(Math.max(0, at - 1));
              } else if (e.key === "Home" && open) {
                e.preventDefault();
                setActive(0);
              } else if (e.key === "End" && open) {
                e.preventDefault();
                setActive(hits.length - 1);
              } else if (e.key === "Enter" && open) {
                e.preventDefault();
                add(at);
              } else if (e.key === "Escape") {
                e.preventDefault();
                if (open) setOpen(false);
                else setText("");
              }
            }}
          />
        </div>
        {open ? (
          <div className="zt-menu xp-combo__pop">
            <ul className="xp-combo__list" role="listbox" tabIndex={-1} id={ids.list} aria-label={pl ? "Wskaźniki" : "Indicators"}>
              {hits.map((k, i) => {
                const fit = fits[i];
                const dom = domainOf(cat, k.group_key) ?? domainOf(cat, k.domain_key);
                return (
                  <li
                    key={k.kpi_key}
                    id={`${ids.list}-${i}`}
                    role="option"
                    aria-selected={i === at}
                    aria-disabled={fit?.blocked || undefined}
                    className={`xp-opt${fit?.blocked ? " xp-opt--off" : ""}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseMove={() => setActive(i)}
                    onClick={() => add(i)}
                  >
                    <span className="xp-opt__name">{kpiName(k, lang)}</span>
                    <span className="xp-opt__meta">
                      {unitName(cat, k.unit_key, lang)} · {freqLabel(k.frequency, lang)} · {sourceName(cat, k.source_keys[0] ?? "", lang)} ·{" "}
                      {nameOf(dom, lang)}
                    </span>
                    {fit ? <span className={`xp-opt__fit${fit.blocked ? "" : " xp-opt__fit--warn"}`}>{fit.text}</span> : null}
                  </li>
                );
              })}
              {!hits.length ? (
                <li className="xp-opt xp-opt--empty" role="option" aria-selected={false} aria-disabled="true">
                  {pl ? "Brak wskaźników dla tego zapytania." : "No indicators match."}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="xp-help" id={ids.help}>
        {pl
          ? `Do ${MAX_KPIS} wskaźników naraz: więcej linii na jednym wykresie przestaje być czytelne.`
          : `Up to ${MAX_KPIS} indicators at a time: more lines on one chart stop being readable.`}
      </p>
      <p className="zt-sr" aria-live="polite">
        {open ? `${hits.length} ${plural(hits.length, lang, ["wynik", "wyniki", "wyników"], ["result", "results"])}` : ""}
      </p>

      {chosen.length ? (
        <ol className="xp-kpis" aria-label={pl ? "Wybrane wskaźniki" : "Selected indicators"}>
          {chosen.map((k, i) => {
            const name = kpiName(k, lang);
            return (
              <li key={k.kpi_key} className="xp-kpi">
                <span className="xp-kpi__n" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="xp-kpi__body">
                  <span className="xp-kpi__name">{name}</span>
                  <span className="xp-kpi__meta">
                    <span className="xp-badge">{unitName(cat, k.unit_key, lang)}</span>
                    <span>{freqLabel(k.frequency, lang)}</span>
                  </span>
                  {k.source_keys.length > 1 ? (
                    <select
                      className="ex-select xp-select-sm"
                      aria-label={(pl ? "Źródło: " : "Source: ") + name}
                      value={sourceOf(q, k)}
                      onChange={(e) => onSource(k.kpi_key, e.target.value)}
                    >
                      {k.source_keys.map((s) => (
                        <option key={s} value={s}>
                          {sourceName(cat, s, lang)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="xp-kpi__src">{sourceName(cat, k.source_keys[0] ?? "", lang)}</span>
                  )}
                </div>
                <div className="xp-kpi__tools">
                  <button
                    type="button"
                    className="xp-icon"
                    disabled={i === 0}
                    aria-label={(pl ? "Przesuń wyżej: " : "Move up: ") + name}
                    onClick={() => onMove(k.kpi_key, -1)}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className="xp-icon"
                    disabled={i === chosen.length - 1}
                    aria-label={(pl ? "Przesuń niżej: " : "Move down: ") + name}
                    onClick={() => onMove(k.kpi_key, 1)}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                  <button
                    type="button"
                    className="xp-icon"
                    aria-label={(pl ? "Usuń wskaźnik: " : "Remove indicator: ") + name}
                    onClick={() => onRemove(k.kpi_key)}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="xp-help">{pl ? "Nie wybrano wskaźnika." : "No indicator selected."}</p>
      )}
    </div>
  );
}
