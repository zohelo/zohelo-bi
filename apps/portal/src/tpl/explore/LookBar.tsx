// The look bar of a chart (owner's "outfits", 2026-11-09): ‹ › always in the same place flip through the prepared
// looks of the chart type on the reader's own data; "Dostosuj" opens the settings in groups like a format pane;
// a modified look says so and can be reset. Layout settings move dimensions between the wells (series on one chart,
// small multiples, seasonal). Prototype for the line chart (looks.ts).

import type { Lang } from "../../i18n";
import { Segmented } from "../ui/blocks";
import { Icon } from "../ui/icons";
import type { Grain } from "./model";
import type { Query, QueryInput } from "./exploreState";
import {
  LINE_SETTINGS,
  SETTING_GROUPS,
  changedSettings,
  currentLook,
  effectiveSettings,
  layoutOf,
  looksOf,
  type Look,
  type SettingDef,
} from "./looks";
import { PopButton } from "./PopButton";

type Ctx = { rates: boolean; grain: Grain };

/** The dimension that splits the lines (legend or panels), if any. */
function seriesDim(q: Query): string | null {
  const s = q.slots;
  return s.legend && s.legend !== "t" ? s.legend : (s.sm ?? null);
}

/** Wells for a layout; undefined when the data cannot be laid out that way. */
function layoutSlots(q: Query, layout: string, ctx: Ctx): Partial<Query["slots"]> | undefined {
  const d = seriesDim(q);
  if (layout === "series") return { ...q.slots, x: "t", legend: d, sm: null };
  if (layout === "panels") return d ? { ...q.slots, x: "t", legend: null, sm: d } : undefined;
  if (layout === "seasonal")
    return ctx.grain === "y" ? undefined : { ...q.slots, x: ctx.grain === "m" ? "t.moy" : "t.qoy", legend: "t", sm: d };
  return undefined;
}

/** Why a setting's option cannot be chosen now (empty = it can). */
function optionLock(def: SettingDef, value: string, q: Query, ctx: Ctx, pl: boolean): string {
  if (def.key === "scale" && value === "index" && ctx.rates)
    return pl
      ? "Indeks ma sens dla poziomów (PKB, płace), nie dla stóp i udziałów."
      : "An index suits levels (GDP, wages), not rates and shares.";
  if (def.key === "layout" && !layoutSlots(q, value, ctx))
    return value === "panels"
      ? pl
        ? "Panele wymagają co najmniej dwóch serii (obszarów, kategorii lub miar)."
        : "Panels need at least two series (areas, categories or measures)."
      : pl
        ? "Sezonowość wymaga danych miesięcznych lub kwartalnych."
        : "Seasonality needs monthly or quarterly data.";
  return "";
}

function lookUsable(l: Look, q: Query, ctx: Ctx): boolean {
  if (l.lockedPl) return false;
  if (ctx.rates && l.forLevelsOnly) return false;
  return !!layoutSlots(q, l.settings.layout!, ctx);
}

export function LookBar({
  q,
  lang,
  onPatch,
  rates,
  grain,
}: {
  q: Query;
  lang: Lang;
  onPatch: (p: Partial<QueryInput>) => void;
  /** The measures are rates or shares: looks and settings for levels only are locked. */
  rates: boolean;
  grain: Grain;
}) {
  const pl = lang === "pl";
  const ctx: Ctx = { rates, grain };
  const looks = looksOf(q.chart);
  const look = currentLook(q.chart, q.v);
  if (!looks || !look) return null;
  const i = looks.indexOf(look);
  const changed = changedSettings(look, q.o, q.slots);
  const settings = effectiveSettings(look, q.o, q.slots);
  const usable = looks.filter((l) => lookUsable(l, q, ctx));
  // Leaving the seasonal layout (which reads years) returns to the measure's own grain.
  const layoutPatch = (layout: string): Partial<QueryInput> => {
    if (layoutOf(q.slots) === layout) return {};
    const slots = layoutSlots(q, layout, ctx);
    if (!slots) return {};
    return { slots, ...(layoutOf(q.slots) === "seasonal" ? { grain: null } : {}) };
  };
  const choose = (l: Look) => onPatch({ v: l.id, o: {}, ...layoutPatch(l.settings.layout!) });
  const go = (dir: 1 | -1) => {
    let j = i;
    do j = (j + dir + looks.length) % looks.length;
    while (!lookUsable(looks[j]!, q, ctx) && j !== i);
    choose(looks[j]!);
  };
  const set = (def: SettingDef, value: string) => {
    if (def.key === "layout") {
      const p = layoutPatch(value);
      if (p.slots) onPatch({ ...p, o: q.o });
      return;
    }
    const o = { ...q.o, [def.key]: value };
    if (look.settings[def.key] === value) delete o[def.key];
    onPatch({ o });
  };
  const reset = () => onPatch({ o: {}, ...layoutPatch(look.settings.layout!) });
  const groups = [...new Set(LINE_SETTINGS.map((d) => d.group))];
  const pos = usable.indexOf(look);
  return (
    <div className="x3-look" role="group" aria-label={pl ? "Wygląd wykresu" : "Chart look"}>
      <span className="x3-look__nav">
        <button
          type="button"
          className="zt-btn zt-btn--ghost x3-look__arrow"
          onClick={() => go(-1)}
          title={pl ? "Poprzedni wygląd" : "Previous look"}
        >
          <Icon name="chevronLeft" size={16} />
          <span className="zt-sr">{pl ? "Poprzedni wygląd" : "Previous look"}</span>
        </button>
        <button
          type="button"
          className="zt-btn zt-btn--ghost x3-look__arrow"
          onClick={() => go(1)}
          title={pl ? "Następny wygląd" : "Next look"}
        >
          <Icon name="chevronRight" size={16} />
          <span className="zt-sr">{pl ? "Następny wygląd" : "Next look"}</span>
        </button>
      </span>
      <span className="x3-look__name" aria-live="polite">
        <span className="small x3-look__label">{pl ? "Wygląd: " : "Look: "}</span>
        <strong>{pl ? look.pl : look.en}</strong>
        <span className="x3-look__n">
          {" "}
          {(pos >= 0 ? pos : i) + 1}/{usable.length}
        </span>
        {changed.length ? <span className="x3-look__mod"> · {pl ? "zmieniony" : "modified"}</span> : null}
      </span>
      <PopButton
        className="zt-btn x3-look__custom"
        title={pl ? "Dostosuj wykres" : "Customise the chart"}
        closeLabel={pl ? "Zamknij" : "Close"}
        size="md"
        trigger={
          <>
            <Icon name="sliders" size={16} />
            <span>{pl ? "Dostosuj" : "Customise"}</span>
            {changed.length ? <span className="x3-look__count">{changed.length}</span> : null}
          </>
        }
      >
        <div className="x3-settings">
          <p className="small x3-settings__intro">
            {pl
              ? `Wygląd „${look.pl}” to gotowy zestaw tych ustawień. Zmień dowolne; „Przywróć wygląd” cofa zmiany.`
              : `The “${look.en}” look is a preset of these settings. Change any; “Reset look” undoes the changes.`}
          </p>
          {groups.map((g, gi) => {
            // Panel settings only matter with panels.
            const defs = LINE_SETTINGS.filter(
              (d) => d.group === g && ((d.key !== "panelAxis" && d.key !== "panelContext") || settings.layout === "panels"),
            );
            const n = defs.filter((d) => changed.includes(d.key)).length;
            return (
              <details key={g} className="x3-settings__group" open={gi < 2 || n > 0}>
                <summary>
                  {pl ? SETTING_GROUPS[g].pl : SETTING_GROUPS[g].en}
                  {n ? <span className="x3-look__count">{n}</span> : null}
                </summary>
                {defs.map((d) => (
                  <div key={d.key} className="x3-settings__row">
                    <span className="x3-settings__name">
                      {pl ? d.pl : d.en}
                      {changed.includes(d.key) ? <span className="x3-look__mod"> · {pl ? "zmienione" : "changed"}</span> : null}
                    </span>
                    {d.lockedPl ? (
                      <span className="small x3-settings__locked">{pl ? d.lockedPl : d.lockedEn}</span>
                    ) : (
                      <>
                        <Segmented<string>
                          small
                          label={pl ? d.pl : d.en}
                          value={settings[d.key]!}
                          onChange={(val) => {
                            if (!optionLock(d, val, q, ctx, pl)) set(d, val);
                          }}
                          options={d.options.map((o) => ({
                            value: o.value,
                            label: (pl ? o.pl : o.en) + (optionLock(d, o.value, q, ctx, pl) ? " ⊘" : ""),
                          }))}
                        />
                        {d.options
                          .map((o) => optionLock(d, o.value, q, ctx, pl))
                          .filter(Boolean)
                          .map((why) => (
                            <span key={why} className="small x3-settings__locked">
                              ⊘ {why}
                            </span>
                          ))}
                      </>
                    )}
                  </div>
                ))}
              </details>
            );
          })}
        </div>
      </PopButton>
      {changed.length ? (
        <button type="button" className="zt-btn zt-btn--ghost x3-look__reset" onClick={reset}>
          {pl ? "Przywróć wygląd" : "Reset look"}
        </button>
      ) : null}
      <span className="small x3-look__note">{pl ? look.notePl : look.noteEn}</span>
    </div>
  );
}
