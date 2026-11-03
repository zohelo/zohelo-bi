// Query panel of the explorer (design template: TemplateExplorer). Order: Wskaźnik, Poziom geograficzny,
// Obszar (chips), Źródła (checkboxes with year ranges), Podział, Okres, Typ wykresu, then Wyczyść / Zapisz widok.

import { useId } from "react";
import type { Lang } from "../../i18n";
import type { Catalog, GeoLevel, Kpi } from "../../data";
import { geoName, sourceName } from "../chartData";
import { Segmented } from "../ui/blocks";
import { KpiPicker } from "./KpiPicker";
import { ListboxButton } from "./Listbox";
import { hasVoivodeships, nameOf, yearOf, yearRange } from "./kpiInfo";
import { levelGeos, type ExState, type ExView } from "./exploreState";

export const MAX_AREAS = 10;

export function ExplorePanel({
  cat,
  kpi,
  state,
  lang,
  swatch,
  onChange,
  onPickKpi,
  onClear,
  onSave,
}: {
  cat: Catalog;
  kpi: Kpi;
  state: ExState;
  lang: Lang;
  /** Series colour of an area, when it has its own line. */
  swatch: (geo: string) => string | undefined;
  onChange: (patch: Partial<ExState>) => void;
  onPickKpi: (key: string) => void;
  onClear: () => void;
  onSave: () => void;
}) {
  const pl = lang === "pl";
  const ids = { split: useId(), from: useId(), to: useId() };
  const voiv = hasVoivodeships(kpi);
  const avail = levelGeos(kpi, cat, state.level).filter((g) => !state.areas.includes(g));
  const years: number[] = [];
  for (let y = yearOf(kpi.first_period); y <= yearOf(kpi.last_period); y++) years.push(y);
  const views: { value: ExView; label: string }[] = [
    { value: "line", label: pl ? "Linia" : "Line" },
    { value: "bars", label: pl ? "Słupki" : "Bars" },
    ...(voiv ? [{ value: "map" as const, label: pl ? "Mapa" : "Map" }] : []),
    { value: "table", label: pl ? "Tabela" : "Table" },
  ];

  return (
    <section className="zt-card ex-panel" aria-labelledby="ex-panel-h">
      <h2 className="zt-sr" id="ex-panel-h">
        {pl ? "Zapytanie" : "Query"}
      </h2>
      <div className="ex-panel__grid">
        <div className="ex-panel__sec ex-panel__sec--wide">
          <KpiPicker cat={cat} kpi={kpi} lang={lang} onPick={onPickKpi} />
        </div>

        <div className="ex-panel__sec">
          <span className="ex-panel__label label-caps" id="ex-lvl">
            {pl ? "Poziom geograficzny" : "Geographic level"}
          </span>
          {voiv ? (
            <Segmented<GeoLevel>
              label={pl ? "Poziom geograficzny" : "Geographic level"}
              value={state.level}
              onChange={(level) => onChange({ level, areas: [], view: level === "country" && state.view === "map" ? "line" : state.view })}
              options={[
                { value: "country", label: pl ? "Kraj" : "Country" },
                { value: "voivodeship", label: pl ? "Województwa" : "Voivodeships" },
              ]}
            />
          ) : (
            <p className="small ex-muted ex-m0">
              {pl ? "Ten wskaźnik ma dane tylko dla krajów." : "This indicator has country data only."}
            </p>
          )}
        </div>

        <fieldset className="ex-panel__sec ex-fieldset">
          <legend className="ex-panel__label label-caps">{pl ? "Obszar" : "Areas"}</legend>
          <div className="ex-chips">
            {state.areas.map((g) => {
              const c = swatch(g);
              const name = geoName(cat, g, lang);
              return (
                <span key={g} className="zt-chip ex-chip">
                  {c ? <i style={{ background: c }} aria-hidden="true" /> : null}
                  {name}
                  {state.areas.length > 1 ? (
                    <button
                      type="button"
                      aria-label={(pl ? "Usuń " : "Remove ") + name}
                      onClick={() => onChange({ areas: state.areas.filter((x) => x !== g) })}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              );
            })}
            {avail.length && state.areas.length < MAX_AREAS ? (
              <ListboxButton
                label={pl ? "Dodaj obszar" : "Add area"}
                value=""
                buttonClass="ex-addchip"
                trigger={<>+ {pl ? "Dodaj obszar" : "Add area"}</>}
                options={avail.map((g) => ({ value: g, label: geoName(cat, g, lang) }))}
                onChange={(g) => onChange({ areas: [...state.areas, g] })}
              />
            ) : null}
          </div>
        </fieldset>

        <fieldset className="ex-panel__sec ex-fieldset">
          <legend className="ex-panel__label label-caps">{pl ? "Źródła" : "Sources"}</legend>
          <div className="ex-checks">
            {kpi.source_keys.map((s) => {
              const on = state.sources.includes(s);
              const only = on && state.sources.length === 1;
              return (
                <label key={s} className="ex-check">
                  <input
                    type="checkbox"
                    checked={on}
                    aria-disabled={only || undefined}
                    onChange={() => {
                      if (only) return;
                      onChange({
                        sources: on
                          ? state.sources.filter((x) => x !== s)
                          : kpi.source_keys.filter((x) => x === s || state.sources.includes(x)),
                      });
                    }}
                  />
                  <span className="ex-check__name">{sourceName(cat, s, lang)}</span>
                  <span className="caption ex-muted tnum">{yearRange(kpi)}</span>
                </label>
              );
            })}
          </div>
          {kpi.source_keys.length > 1 ? (
            <p className="caption ex-muted ex-m0">
              {pl ? "Zaznacz kilka, aby porównać źródła; jedno musi zostać." : "Tick several to compare sources; one must stay."}
            </p>
          ) : null}
        </fieldset>

        {kpi.dimension_keys.length ? (
          <div className="ex-panel__sec">
            <label className="ex-panel__label label-caps" htmlFor={ids.split}>
              {pl ? "Podział" : "Breakdown"}
            </label>
            <select
              id={ids.split}
              className="ex-select ex-select--full"
              value={state.split ?? ""}
              onChange={(e) => onChange({ split: e.target.value || null })}
            >
              <option value="">{pl ? "Bez podziału (ogółem)" : "No breakdown (total)"}</option>
              {kpi.dimension_keys.map((d) => (
                <option key={d} value={d}>
                  {nameOf(
                    cat.dimensions.find((x) => x.dimension_key === d),
                    lang,
                    d,
                  )}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <fieldset className="ex-panel__sec ex-fieldset">
          <legend className="ex-panel__label label-caps">{pl ? "Okres" : "Period"}</legend>
          <div className="ex-period">
            <div>
              <label htmlFor={ids.from} className="small">
                {pl ? "Od" : "From"}
              </label>
              <select
                id={ids.from}
                className="ex-select ex-select--full"
                value={state.from}
                onChange={(e) => onChange({ from: Number(e.target.value), to: Math.max(state.to, Number(e.target.value)) })}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={ids.to} className="small">
                {pl ? "Do" : "To"}
              </label>
              <select
                id={ids.to}
                className="ex-select ex-select--full"
                value={state.to}
                onChange={(e) => onChange({ to: Number(e.target.value), from: Math.min(state.from, Number(e.target.value)) })}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="ex-panel__sec">
          <span className="ex-panel__label label-caps">{pl ? "Typ wykresu" : "Chart type"}</span>
          <Segmented<ExView>
            label={pl ? "Typ wykresu" : "Chart type"}
            value={state.view}
            onChange={(view) =>
              onChange(view === "map" ? { view, level: "voivodeship", areas: state.level === "voivodeship" ? state.areas : [] } : { view })
            }
            options={views}
          />
          {voiv ? null : (
            <p className="caption ex-muted ex-m0">
              {pl ? "Mapa jest dostępna dla danych wojewódzkich." : "The map needs voivodeship data."}
            </p>
          )}
        </div>

        <div className="ex-panel__sec ex-panel__sec--wide ex-panel__actions">
          <button type="button" className="zt-btn" onClick={onClear}>
            {pl ? "Wyczyść" : "Reset"}
          </button>
          <button type="button" className="zt-btn zt-btn--primary" onClick={onSave}>
            {pl ? "Zapisz widok" : "Save view"}
          </button>
        </div>
      </div>
    </section>
  );
}
