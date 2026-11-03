// Indicator picker of the explorer: a button with the current indicator opens a search combobox over the
// whole catalogue (accent-insensitive). Arrow keys move the active option, Enter picks, Esc closes.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Lang } from "../../i18n";
import type { Catalog, Kpi } from "../../data";
import { freqLabel } from "../format";
import { Icon } from "../ui/icons";
import { domainOf, nameOf, unitName } from "./kpiInfo";
import { plural, searchDocs, searchKpis } from "./search";

const MAX_HITS = 60;

export function KpiPicker({ cat, kpi, lang, onPick }: { cat: Catalog; kpi: Kpi; lang: Lang; onPick: (key: string) => void }) {
  const pl = lang === "pl";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const labelId = useId();
  const docs = useMemo(() => searchDocs(cat), [cat]);
  const hits = useMemo(() => searchKpis(docs, q).slice(0, MAX_HITS), [docs, q]);
  const group = (k: Kpi) => `${nameOf(domainOf(cat, k.domain_key), lang)} · ${nameOf(domainOf(cat, k.group_key), lang)}`;

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const close = () => {
    setOpen(false);
    setQ("");
    setActive(0);
    button.current?.focus();
  };
  const pick = (k: Kpi) => {
    onPick(k.kpi_key);
    close();
  };

  return (
    <div className="ex-picker" ref={wrap}>
      <span className="ex-panel__label label-caps" id={labelId}>
        {pl ? "Wskaźnik" : "Indicator"}
      </span>
      <button
        ref={button}
        type="button"
        className="ex-picker__btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${listId}-cur`}
        onClick={() => setOpen(!open)}
      >
        <span className="ex-picker__txt" id={`${listId}-cur`}>
          <strong>{nameOf(kpi, lang)}</strong>
          <small className="caption">
            {unitName(cat, kpi.unit_key, lang)} · {freqLabel(kpi.frequency, lang)} · {kpi.source_keys.length}{" "}
            {plural(kpi.source_keys.length, lang, ["źródło", "źródła", "źródeł"], ["source", "sources"])}
          </small>
        </span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open ? (
        <div className="zt-menu ex-picker__pop" role="dialog" aria-label={pl ? "Wybierz wskaźnik" : "Choose an indicator"}>
          <label className="zt-search ex-picker__search">
            <Icon name="search" />
            <input
              ref={input}
              type="text"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={hits.length ? `${listId}-${active}` : undefined}
              aria-label={pl ? "Szukaj wskaźnika" : "Search indicators"}
              placeholder={pl ? "np. bezrobocie, kurs euro" : "e.g. unemployment, euro rate"}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(hits.length - 1, a + 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(0, a - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (hits[active]) pick(hits[active]);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  close();
                }
              }}
            />
          </label>
          <div className="ex-picker__list" role="listbox" id={listId} aria-label={pl ? "Wskaźniki" : "Indicators"}>
            {hits.map((k, i) => (
              <div
                key={k.kpi_key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className="ex-picker__opt"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(k)}
                onMouseMove={() => setActive(i)}
              >
                <span>{nameOf(k, lang)}</span>
                <small>{group(k)}</small>
              </div>
            ))}
            {!hits.length ? (
              <p className="ex-picker__empty">{pl ? "Brak wskaźników dla tego zapytania." : "No indicators match."}</p>
            ) : null}
          </div>
          <p className="ex-picker__foot caption" aria-live="polite">
            {hits.length === MAX_HITS
              ? pl
                ? `Pierwsze ${MAX_HITS} wyników; zawęź wyszukiwanie.`
                : `First ${MAX_HITS} results; refine the search.`
              : `${hits.length} ${plural(hits.length, lang, ["wynik", "wyniki", "wyników"], ["result", "results"])}`}
          </p>
        </div>
      ) : null}
    </div>
  );
}
