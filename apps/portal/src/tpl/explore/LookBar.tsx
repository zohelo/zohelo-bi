// The wardrobe on the chart (owner's "outfits", 2026-11-09; docs/chart-looks-spec.md):
//   LookBar   ‹ › always in the same place, then a strip of the type's looks (glyph + name, the current one marked,
//             locked ones greyed with the reason), then "Dostosuj" which opens the settings pane; under it the look's
//             occasion in one line and, when the reader changed something, what changed and "Przywróć wygląd".
//   LookPane  the settings (accessories): search, groups like a format pane, one segmented control per setting, a
//             hint under it, locked options marked ⊘ with the reason. Docked beside the chart on wide screens so every
//             change shows live; under the chart on narrow ones.
// Layout settings move dimensions between the wells (series on one chart, panels, seasonal); everything else is a
// drawing setting kept in the URL as o.<key>=<value>.

import { useEffect, useId, useRef, useState } from "react";
import type { Lang } from "../../i18n";
import { Segmented, Sr } from "../ui/blocks";
import { Icon } from "../ui/icons";
import type { Query, QueryInput, Shape } from "./exploreState";
import { LookGlyph } from "./LookGlyph";
import {
  GROUP_ORDER,
  SETTING_GROUPS,
  SETTINGS,
  TYPE_NAME,
  changedSettings,
  lookInEffect,
  layoutOf,
  layoutSlots,
  lookLock,
  lookUsable,
  looksOf,
  optionLock,
  seriesValue,
  visibleSettings,
  wardrobeOf,
  wearsLook,
  type Look,
  type LookCtx,
  type SettingDef,
} from "./looks";

type Common = {
  q: Query;
  shape: Shape;
  lang: Lang;
  onPatch: (p: Partial<QueryInput>) => void;
};

/** Everything the bar and the pane share for the current query. */
function useWardrobe({ q, shape, lang, onPatch }: Common) {
  const pl = lang === "pl";
  const type = wardrobeOf(q.chart);
  const looks = looksOf(q.chart);
  // The look worn: the chosen one, or the type's default when the chosen one is locked for these data (the bar
  // and the pane then speak of the worn look, as the chart does).
  const worn = wearsLook(q) ? lookInEffect(q, shape, lang) : null;
  const look = worn?.look;
  if (!type || !looks || !look || !worn) return null;
  const fallback = worn.fallback;
  const o = fallback ? {} : q.o;
  const { ctx, settings } = worn;
  const changed = changedSettings(look, o, ctx);
  const usable = (l: Look) => lookUsable(l, q, ctx);
  const lockText = (l: Look) => lookLock(l, q, ctx, lang);
  const layoutPatch = (layout: string): Partial<QueryInput> => {
    if (seriesValue(type, layoutOf(q.slots)) === layout) return {};
    const slots = layoutSlots(q, layout, ctx);
    if (!slots) return {};
    return { slots, ...(layoutOf(q.slots) === "seasonal" ? { grain: null } : {}) };
  };
  const choose = (l: Look) => onPatch({ v: l.id, o: {}, ...layoutPatch(l.settings.series ?? "") });
  // A change on top of a fallback look makes that look the chosen one.
  const vPatch = fallback ? { v: look.id } : {};
  const set = (def: SettingDef, value: string) => {
    if (def.key === "series") {
      const p = layoutPatch(value);
      if (p.slots) onPatch({ ...p, ...vPatch, o });
      return;
    }
    const next = { ...o, [def.key]: value };
    if (look.settings[def.key] === value) delete next[def.key];
    onPatch({ ...vPatch, o: next });
  };
  const reset = () => onPatch({ ...vPatch, o: {}, ...layoutPatch(look.settings.series ?? "") });
  const name = (d: SettingDef) => (pl ? d.pl : d.en);
  return { pl, type, looks, look, fallback, ctx, settings, changed, usable, lockText, choose, set, reset, name };
}

export function LookBar({
  paneOpen,
  onPane,
  ...common
}: Common & {
  paneOpen: boolean;
  onPane: (open: boolean) => void;
}) {
  const w = useWardrobe(common);
  const stripRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const lookId = w?.look.id;
  // The current card stays in view when the look changes (arrows, picker, link).
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]');
    el?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [lookId]);
  if (!w) return null;
  const { pl, looks, look, fallback, changed, usable, lockText, choose, reset, name, type } = w;
  const i = looks.indexOf(look);
  const go = (dir: 1 | -1) => {
    let j = i;
    do j = (j + dir + looks.length) % looks.length;
    while (!usable(looks[j]!) && j !== i);
    choose(looks[j]!);
  };
  const open = usable(look) ? looks.filter(usable) : looks;
  const pos = open.indexOf(look);
  const changedNames = changed.map((k) => SETTINGS[type].find((d) => d.key === k)).filter((d): d is SettingDef => !!d);
  return (
    <div className="x3-look" role="group" aria-labelledby={`${id}-h`}>
      <h3 className="zt-sr" id={`${id}-h`}>
        {pl ? "Wygląd wykresu" : "Chart look"}
      </h3>
      <div className="x3-look__bar">
        <span className="x3-look__nav">
          <button type="button" className="zt-btn x3-look__arrow" onClick={() => go(-1)} title={pl ? "Poprzedni wygląd" : "Previous look"}>
            <Icon name="chevronLeft" size={16} />
            <Sr>{pl ? "Poprzedni wygląd" : "Previous look"}</Sr>
          </button>
          <button type="button" className="zt-btn x3-look__arrow" onClick={() => go(1)} title={pl ? "Następny wygląd" : "Next look"}>
            <Icon name="chevronRight" size={16} />
            <Sr>{pl ? "Następny wygląd" : "Next look"}</Sr>
          </button>
        </span>
        <div
          className="x3-look__strip"
          ref={stripRef}
          role="group"
          aria-label={pl ? `Wyglądy: ${TYPE_NAME[type].pl}` : `Looks: ${TYPE_NAME[type].en}`}
        >
          {looks.map((l) => {
            const ok = usable(l);
            const why = ok ? "" : lockText(l);
            return (
              <button
                key={l.id}
                type="button"
                className={`x3-look__card${l.style === "business" ? " x3-look__card--business" : ""}`}
                aria-pressed={l === look}
                disabled={!ok}
                title={ok ? (pl ? l.notePl : l.noteEn) : why}
                onClick={() => choose(l)}
              >
                <LookGlyph glyph={l.glyph} />
                <span className="x3-look__cname">{pl ? l.pl : l.en}</span>
                {!ok ? <Sr>{` — ${pl ? "niedostępny" : "unavailable"}: ${why}`}</Sr> : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className={`zt-btn x3-look__custom${paneOpen ? " is-on" : ""}`}
          aria-pressed={paneOpen}
          onClick={() => onPane(!paneOpen)}
          title={pl ? "Ustawienia wykresu" : "Chart settings"}
        >
          <Icon name="sliders" size={16} />
          <span>{pl ? "Dostosuj" : "Customise"}</span>
          {changed.length ? <span className="x3-look__count">{changed.length}</span> : null}
        </button>
      </div>
      <p className="small x3-look__note">
        <span className="x3-look__name" aria-live="polite">
          <strong>{pl ? look.pl : look.en}</strong>
          <span className="x3-look__n">
            {" "}
            {(pos >= 0 ? pos : i) + 1}/{open.length}
          </span>
          {" · "}
        </span>
        {changed.length ? (
          <>
            <span className="x3-look__mod">
              {pl ? "zmienione: " : "changed: "}
              {changedNames.map(name).join(", ")}
            </span>
            {" · "}
            <button type="button" className="zt-btn zt-btn--ghost x3-look__reset" onClick={reset}>
              {pl ? "Przywróć wygląd" : "Reset look"}
            </button>
          </>
        ) : (
          <span>
            {fallback
              ? pl
                ? `„${fallback.chosen.pl}” jest niedostępny: ${fallback.why} Pokazano „${look.pl}”.`
                : `“${fallback.chosen.en}” is unavailable: ${fallback.why} Showing “${look.en}”.`
              : pl
                ? look.notePl
                : look.noteEn}
          </span>
        )}
      </p>
    </div>
  );
}

/** The settings pane (accessories and alterations of the look in effect). */
export function LookPane({ onClose, ...common }: Common & { onClose: () => void }) {
  const w = useWardrobe(common);
  const [query, setQuery] = useState("");
  const id = useId();
  if (!w) return null;
  const { pl, look, ctx, settings, changed, set, reset, name, type } = w;
  const lang = common.lang;
  const needle = query.trim().toLocaleLowerCase(lang);
  const defs = visibleSettings(look, settings, ctx).filter(
    (d) =>
      !needle ||
      name(d).toLocaleLowerCase(lang).includes(needle) ||
      d.options.some((o) => (pl ? o.pl : o.en).toLocaleLowerCase(lang).includes(needle)),
  );
  const groups = GROUP_ORDER.filter((g) => defs.some((d) => d.group === g));
  return (
    <section className="x3-pane" aria-labelledby={`${id}-h`}>
      <div className="x3-pane__head">
        <h3 className="x3-pane__h" id={`${id}-h`}>
          {pl ? "Dostosuj wykres" : "Customise the chart"}
        </h3>
        {changed.length ? (
          <button type="button" className="zt-btn zt-btn--ghost x3-pane__reset" onClick={reset}>
            {pl ? "Przywróć wygląd" : "Reset look"}
          </button>
        ) : null}
        <button type="button" className="xp-icon" aria-label={pl ? "Zamknij ustawienia" : "Close settings"} onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <p className="small x3-pane__look">
        {pl ? "Wygląd " : "Look "}
        <strong>{pl ? look.pl : look.en}</strong>
        {pl
          ? ` to gotowy zestaw tych ustawień (${TYPE_NAME[type].pl.toLocaleLowerCase("pl")}). `
          : ` is a preset of these settings (${TYPE_NAME[type].en.toLocaleLowerCase("en")}). `}
        {pl ? "Zmień, co chcesz; wykres zmienia się od razu." : "Change anything; the chart follows at once."}
      </p>
      <label className="x3-pane__search">
        <Icon name="search" size={14} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={pl ? "Szukaj ustawienia" : "Find a setting"}
          aria-label={pl ? "Szukaj ustawienia" : "Find a setting"}
        />
      </label>
      {!groups.length ? <p className="small x3-pane__none">{pl ? "Żadne ustawienie nie pasuje." : "No setting matches."}</p> : null}
      {groups.map((g, gi) => {
        const rows = defs.filter((d) => d.group === g);
        const n = rows.filter((d) => changed.includes(d.key)).length;
        return (
          <details key={g} className="x3-pane__group" open={!!needle || gi < 2 || n > 0 || g === "compare"}>
            <summary>
              {pl ? SETTING_GROUPS[g].pl : SETTING_GROUPS[g].en}
              {n ? <span className="x3-look__count">{n}</span> : null}
            </summary>
            {rows.map((d) => (
              <SettingRow
                key={d.key}
                def={d}
                settings={settings}
                ctx={ctx}
                lang={lang}
                changed={changed.includes(d.key)}
                onSet={(v) => set(d, v)}
              />
            ))}
          </details>
        );
      })}
    </section>
  );
}

function SettingRow({
  def: d,
  settings,
  ctx,
  lang,
  changed,
  onSet,
}: {
  def: SettingDef;
  settings: Record<string, string>;
  ctx: LookCtx;
  lang: Lang;
  changed: boolean;
  onSet: (v: string) => void;
}) {
  const pl = lang === "pl";
  const locks = d.options.map((o) => optionLock(d, o.value, ctx, settings, lang));
  const reasons = [...new Set(locks.filter(Boolean))];
  return (
    <div className={`x3-pane__row${changed ? " is-changed" : ""}`}>
      <span className="x3-pane__name">
        {pl ? d.pl : d.en}
        {changed ? <span className="x3-look__mod"> · {pl ? "zmienione" : "changed"}</span> : null}
      </span>
      {d.lockedPl ? (
        <span className="small x3-pane__locked">{pl ? d.lockedPl : d.lockedEn}</span>
      ) : (
        <>
          <Segmented<string>
            small
            label={pl ? d.pl : d.en}
            value={settings[d.key]!}
            onChange={(val) => {
              if (!locks[d.options.findIndex((o) => o.value === val)]) onSet(val);
            }}
            options={d.options.map((o, i) => ({ value: o.value, label: (pl ? o.pl : o.en) + (locks[i] ? " ⊘" : "") }))}
          />
          {reasons.map((why) => (
            <span key={why} className="small x3-pane__locked">
              ⊘ {why}
            </span>
          ))}
          {d.hintPl && !reasons.length ? <span className="small x3-pane__hint">{pl ? d.hintPl : d.hintEn}</span> : null}
        </>
      )}
    </div>
  );
}
