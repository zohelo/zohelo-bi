// The wardrobe on the chart (owner's "outfits", 2026-11-09; docs/chart-looks-spec.md):
//   LookBar   ‹ › always in the same place, then a strip of the type's looks (glyph + name, the current one marked,
//             locked ones greyed with the reason), then "Dostosuj" which opens the settings pane; under it the look's
//             occasion in one line and, when the reader changed something, what changed and "Przywróć wygląd".
//   LookPane  the settings (accessories): search, groups like a format pane, one segmented control per setting, a
//             hint under it, locked options marked ⊘ with the reason. Docked beside the chart on wide screens so every
//             change shows live; under the chart on narrow ones.
// Layout settings move dimensions between the wells (series on one chart, panels, seasonal); everything else is a
// drawing setting kept in the URL as o.<key>=<value>.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Catalog } from "../../data";
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
  lookGroups,
  lookInEffect,
  lookQuestion,
  layoutOf,
  layoutSlots,
  lookLock,
  lookUsable,
  optionLock,
  seriesValue,
  stripLooks,
  visibleSettings,
  visualOverrides,
  visualVariants,
  wardrobeOf,
  wearsLook,
  type Look,
  type LookCtx,
  type SettingDef,
} from "./looks";
import { QUESTIONS } from "./questions";
import { suggestLooks } from "./suggest";

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
  // The look worn: the chosen one, or the type's default when the chosen one is locked for these data (the bar
  // and the pane then speak of the worn look, as the chart does).
  const worn = wearsLook(q) ? lookInEffect(q, shape, lang) : null;
  const look = worn?.look;
  if (!type || !look || !worn) return null;
  const fallback = worn.fallback;
  const o = fallback ? {} : q.o;
  const { ctx, settings } = worn;
  // The strip: the type's looks grouped by the business question they answer, visual variants left to "Dostosuj".
  const groups = lookGroups(type, ctx.timeX);
  const looks = stripLooks(type, ctx.timeX);
  const question = QUESTIONS[lookQuestion(look, ctx.timeX)];
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
  /** A visual variant (smooth, step, labels): its settings on top of the look worn. */
  const variants = visualVariants(type).map((v) => {
    const ov = visualOverrides(v)?.o ?? {};
    const on = Object.keys(ov).length > 0 && Object.entries(ov).every(([k, val]) => settings[k] === val);
    const apply = () => {
      const next = { ...o };
      for (const [k, val] of Object.entries(ov)) {
        if (on || look.settings[k] === val) delete next[k];
        else next[k] = val;
      }
      onPatch({ ...vPatch, o: next });
    };
    return { look: v, on, apply };
  });
  return {
    pl,
    type,
    looks,
    groups,
    question,
    look,
    fallback,
    ctx,
    settings,
    changed,
    usable,
    lockText,
    choose,
    set,
    reset,
    name,
    variants,
  };
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
  const { pl, looks, groups, question, look, fallback, changed, usable, lockText, choose, reset, name, type } = w;
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
          {groups.map((g) => {
            const qn = QUESTIONS[g.q];
            return (
              <div key={g.q} className="x3-look__group" role="group" aria-label={pl ? qn.pl : qn.en}>
                <span className="x3-look__gq" aria-hidden="true" title={pl ? qn.pl : qn.en}>
                  {pl ? qn.shortPl : qn.shortEn}
                </span>
                <div className="x3-look__cards">
                  {g.looks.map((l) => {
                    const ok = usable(l);
                    const why = ok ? "" : lockText(l);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        className={`x3-look__card${l.style === "business" ? " x3-look__card--business" : ""}`}
                        aria-pressed={l === look}
                        disabled={!ok}
                        title={ok ? `${pl ? qn.pl : qn.en} ${pl ? l.notePl : l.noteEn}` : why}
                        onClick={() => choose(l)}
                      >
                        <LookGlyph glyph={l.glyph} />
                        <span className="x3-look__cname">{pl ? l.pl : l.en}</span>
                        {!ok ? <Sr>{` — ${pl ? "niedostępny" : "unavailable"}: ${why}`}</Sr> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
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
            {fallback ? (
              pl ? (
                `„${fallback.chosen.pl}” jest niedostępny: ${fallback.why} Pokazano „${look.pl}”.`
              ) : (
                `“${fallback.chosen.en}” is unavailable: ${fallback.why} Showing “${look.en}”.`
              )
            ) : (
              <>
                <span className="x3-look__q">{pl ? question.pl : question.en}</span> {pl ? look.notePl : look.noteEn}
              </>
            )}
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * Suggestions ("smart without AI"): looks worth trying for the fields in the wells, each with the question it answers
 * and the reason. Rules only (suggest.ts); one click wears the look, undo brings the previous view back.
 */
export function LookSuggestions({ cat, q, shape, lang, onPatch }: Common & { cat: Catalog }) {
  const pl = lang === "pl";
  const id = useId();
  const [why, setWhy] = useState(false);
  const list = useMemo(() => suggestLooks(q, shape, cat, lang), [q, shape, cat, lang]);
  if (!list.length) return null;
  return (
    <div className="x3-suggest" role="group" aria-labelledby={`${id}-h`}>
      <div className="x3-suggest__row">
        <button
          type="button"
          className="zt-btn zt-btn--ghost x3-suggest__h"
          id={`${id}-h`}
          aria-expanded={why}
          aria-controls={`${id}-why`}
          title={pl ? "Pokaż, dlaczego te podpowiedzi" : "Show why these suggestions"}
          onClick={() => setWhy(!why)}
        >
          {pl ? "Podpowiedzi" : "Suggestions"}
          <Icon name="chevronDown" size={14} />
          <Sr>{pl ? ": dlaczego te" : ": why these"}</Sr>
        </button>
        {list.map((s) => (
          <button key={s.look.id} type="button" className="x3-suggest__btn" title={s.reason} onClick={() => onPatch(s.patch)}>
            <span className="x3-suggest__q">{s.questionLabel}</span>
            <span className="x3-suggest__look">{s.label}</span>
            <Sr>. {s.reason}</Sr>
          </button>
        ))}
      </div>
      {why ? (
        <ul className="x3-suggest__reasons" id={`${id}-why`}>
          {list.map((s) => (
            <li key={s.look.id}>
              <strong>{s.label}.</strong> {s.reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** The settings pane (accessories and alterations of the look in effect). */
export function LookPane({ onClose, ...common }: Common & { onClose: () => void }) {
  const w = useWardrobe(common);
  const [query, setQuery] = useState("");
  const id = useId();
  if (!w) return null;
  const { pl, look, ctx, settings, changed, set, reset, name, type, variants } = w;
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
      {variants.length ? (
        <div className="x3-pane__variants" role="group" aria-label={pl ? "Warianty wizualne" : "Visual variants"}>
          <span className="x3-pane__name">{pl ? "Warianty wizualne" : "Visual variants"}</span>
          <div className="x3-pane__chips">
            {variants.map((v) => (
              <button
                key={v.look.id}
                type="button"
                className="x3-lib__look"
                aria-pressed={v.on}
                title={pl ? v.look.notePl : v.look.noteEn}
                onClick={v.apply}
              >
                <LookGlyph glyph={v.look.glyph} />
                <span>{pl ? v.look.pl : v.look.en}</span>
              </button>
            ))}
          </div>
          <span className="small x3-pane__hint">
            {pl ? "Zmieniają tylko rysunek, nie to, co wykres pokazuje." : "They change the drawing only, not what the chart shows."}
          </span>
        </div>
      ) : null}
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
