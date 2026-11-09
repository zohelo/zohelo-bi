// The look bar of a chart (owner's "outfits", 2026-11-09): ‹ › flip through the prepared looks of the chart type on
// the reader's own data, "Dostosuj" opens the settings (the accessories), a modified look says so and can be reset.
// Prototype for the line chart (looks.ts).

import type { Lang } from "../../i18n";
import { Segmented } from "../ui/blocks";
import { Icon } from "../ui/icons";
import type { Query, QueryInput } from "./exploreState";
import { LINE_SETTINGS, SETTING_GROUPS, changedSettings, currentLook, effectiveSettings, looksOf, type SettingDef } from "./looks";
import { PopButton } from "./PopButton";

export function LookBar({
  q,
  lang,
  onPatch,
  rates,
}: {
  q: Query;
  lang: Lang;
  onPatch: (p: Partial<QueryInput>) => void;
  /** The measures are rates or shares: looks and settings for levels only are locked. */
  rates: boolean;
}) {
  const pl = lang === "pl";
  const looks = looksOf(q.chart);
  const look = currentLook(q.chart, q.v);
  if (!looks || !look) return null;
  const i = looks.indexOf(look);
  const changed = changedSettings(look, q.o);
  const settings = effectiveSettings(look, q.o);
  const go = (dir: 1 | -1) => {
    let j = i;
    do j = (j + dir + looks.length) % looks.length;
    while ((looks[j]!.lockedPl || (rates && looks[j]!.forLevelsOnly)) && j !== i);
    onPatch({ v: looks[j]!.id, o: {} });
  };
  const set = (key: SettingDef["key"], value: string) => {
    const o = { ...q.o, [key]: value };
    if (look.settings[key] === value) delete o[key];
    onPatch({ o });
  };
  const groups = [...new Set(LINE_SETTINGS.map((d) => d.group))];
  return (
    <div className="x3-look" role="group" aria-label={pl ? "Wygląd wykresu" : "Chart look"}>
      <span className="small x3-look__label">{pl ? "Wygląd" : "Look"}</span>
      <button
        type="button"
        className="zt-btn zt-btn--ghost x3-look__arrow"
        onClick={() => go(-1)}
        title={pl ? "Poprzedni wygląd" : "Previous look"}
      >
        <Icon name="chevronLeft" size={16} />
        <span className="zt-sr">{pl ? "Poprzedni wygląd" : "Previous look"}</span>
      </button>
      <span className="x3-look__name" aria-live="polite">
        <strong>{pl ? look.pl : look.en}</strong>
        <span className="x3-look__n">
          {" "}
          {i + 1}/{looks.length}
        </span>
        {changed.length ? <span className="x3-look__mod"> · {pl ? "zmieniony" : "modified"}</span> : null}
      </span>
      <button
        type="button"
        className="zt-btn zt-btn--ghost x3-look__arrow"
        onClick={() => go(1)}
        title={pl ? "Następny wygląd" : "Next look"}
      >
        <Icon name="chevronRight" size={16} />
        <span className="zt-sr">{pl ? "Następny wygląd" : "Next look"}</span>
      </button>
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
          {groups.map((g) => (
            <fieldset key={g} className="x3-settings__group">
              <legend>{pl ? SETTING_GROUPS[g].pl : SETTING_GROUPS[g].en}</legend>
              {LINE_SETTINGS.filter((d) => d.group === g).map((d) => (
                <div key={d.key} className="x3-settings__row">
                  <span className="x3-settings__name">
                    {pl ? d.pl : d.en}
                    {changed.includes(d.key) ? <span className="x3-look__mod"> · {pl ? "zmienione" : "changed"}</span> : null}
                  </span>
                  {d.lockedPl || (rates && d.lockedForRatesPl) ? (
                    <span className="small x3-settings__locked">
                      {pl ? (d.lockedPl ?? d.lockedForRatesPl) : (d.lockedEn ?? d.lockedForRatesEn)}
                    </span>
                  ) : (
                    <Segmented<string>
                      small
                      label={pl ? d.pl : d.en}
                      value={settings[d.key]}
                      onChange={(val) => set(d.key, val)}
                      options={d.options.map((o) => ({ value: o.value, label: pl ? o.pl : o.en }))}
                    />
                  )}
                </div>
              ))}
            </fieldset>
          ))}
        </div>
      </PopButton>
      <span className="small x3-look__note">{pl ? look.notePl : look.noteEn}</span>
      {changed.length ? (
        <button type="button" className="zt-btn zt-btn--ghost x3-look__reset" onClick={() => onPatch({ o: {} })}>
          {pl ? "Przywróć wygląd" : "Reset look"}
        </button>
      ) : null}
    </div>
  );
}
