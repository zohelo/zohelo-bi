// Historia dnia (home, layout "story"; Tableau Public's viz of the day): one chart with a title stating the
// finding and two sentences of explanation, a new story each day, and a link to the full view in the explorer.
// Sentences are computed from the data, so they stay true when the numbers change.

import { ZChart, type ZChartProps } from "@zohelo/visuals";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Series } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { geoName, kpiName, periodFormatter, toZSeries, zUnit } from "../chartData";
import { fmtPeriod, fmtValue } from "../format";
import { dayOfYear } from "./HeroBackground";

type Story = {
  id: string;
  kpi: string;
  geos: string[];
  /** Target band drawn on a single line (inflation target). */
  band?: [number, number];
  /** Explorer link opened by "Zobacz w eksploratorze". */
  to: string;
};

const STORIES: Story[] = [
  { id: "cpi", kpi: "cpi_annual_rate", geos: ["PL"], band: [1.5, 3.5], to: "/explore?i=cpi_annual_rate&geo=PL&t=10y&chart=line" },
  {
    id: "gdp",
    kpi: "gdp_real_growth",
    geos: ["PL", "EU27"],
    to: "/explore?i=gdp_real_growth&geo=PL,EU27,DE,CZ&t=10y&chart=line&series=geo&panels=",
  },
  {
    id: "unemp",
    kpi: "unemployment_lfs",
    geos: ["PL", "EU27"],
    to: "/explore?i=unemployment_lfs&geo=PL,EU27&t=10y&chart=line&series=geo&panels=",
  },
  { id: "wage", kpi: "avg_wage", geos: ["PL"], to: "/explore?i=avg_wage&geo=PL&t=10y&chart=line" },
];

export function storyOfDay(cat: Catalog, today = new Date()): { story: Story; kpi: Kpi } | null {
  const ok = STORIES.map((s) => ({ story: s, kpi: cat.kpis.find((k) => k.kpi_key === s.kpi) })).filter(
    (x): x is { story: Story; kpi: Kpi } => !!x.kpi,
  );
  return ok.length ? ok[dayOfYear(today) % ok.length]! : null;
}

const last = (s: Series | undefined) => {
  const pts = s?.points.filter((p) => p.value !== null) ?? [];
  return pts[pts.length - 1];
};
const yearAgo = (s: Series | undefined, period: string, freq: Kpi["frequency"]) => {
  const pts = s?.points ?? [];
  const i = pts.findIndex((p) => p.period === period);
  const back = freq === "M" ? 12 : freq === "Q" ? 4 : 1;
  return i >= back ? pts[i - back] : undefined;
};

/** Title and two sentences from the data. */
function words(story: Story, kpi: Kpi, series: Series[], cat: Catalog, lang: Lang): { title: string; text: string } {
  const pl = lang === "pl";
  const name = kpiName(kpi, lang);
  const pl0 = series.find((s) => s.geography === "PL");
  const l = last(pl0);
  if (!l || l.value === null) return { title: name, text: "" };
  const val = fmtValue(l.value, kpi.unit_key, cat, lang);
  const when = fmtPeriod(l.period, lang);
  const ago = yearAgo(pl0, l.period, kpi.frequency);
  const agoText =
    ago && ago.value !== null
      ? pl
        ? ` Rok wcześniej: ${fmtValue(ago.value, kpi.unit_key, cat, lang)}.`
        : ` A year earlier: ${fmtValue(ago.value, kpi.unit_key, cat, lang)}.`
      : "";
  if (story.band) {
    const [a, b] = story.band;
    const where = l.value < a ? (pl ? "poniżej" : "below") : l.value > b ? (pl ? "powyżej" : "above") : pl ? "w" : "inside";
    return {
      title: pl ? `${name}: ${val}, ${where} paśmie celu NBP` : `${name}: ${val}, ${where} the NBP target band`,
      text: pl
        ? `W ${when} wskaźnik wyniósł ${val}; cel NBP to 2,5% ± 1 pp.${agoText}`
        : `In ${when} the rate was ${val}; the NBP target is 2.5% ± 1 pp.${agoText}`,
    };
  }
  const other = series.find((s) => s.geography !== "PL");
  const o = other ? last(other) : undefined;
  if (other && o && o.value !== null) {
    const diff = l.value - o.value;
    const on = geoName(cat, other.geography, lang);
    const cmp =
      Math.abs(diff) < 0.05
        ? pl
          ? "tyle samo co"
          : "the same as"
        : diff > 0
          ? pl
            ? "więcej niż"
            : "higher than"
          : pl
            ? "mniej niż"
            : "lower than";
    return {
      title: pl ? `${name}: Polska ${cmp} ${on}` : `${name}: Poland ${cmp} ${on}`,
      text: pl
        ? `Polska: ${val}, ${on}: ${fmtValue(o.value, kpi.unit_key, cat, lang)} (${when}).${agoText}`
        : `Poland: ${val}, ${on}: ${fmtValue(o.value, kpi.unit_key, cat, lang)} (${when}).${agoText}`,
    };
  }
  return {
    title: pl ? `${name}: ${val} w ${when}` : `${name}: ${val} in ${when}`,
    text: pl
      ? `Najnowszy odczyt dla Polski.${agoText} Pełna seria i tabela są w eksploratorze.`
      : `The latest reading for Poland.${agoText} The full series and table are in the explorer.`,
  };
}

export function StoryCard({ cat, lang, today }: { cat: Catalog; lang: Lang; today?: Date }) {
  const pl = lang === "pl";
  const pick = storyOfDay(cat, today);
  const geos = pick ? pick.story.geos.filter((g) => pick.kpi.geographies.includes(g)) : [];
  const from = pick ? String(Number(pick.kpi.last_period.slice(0, 4)) - 6) : "";
  const series = useData(pick ? `story|${pick.story.id}|${geos.join(",")}` : null, () =>
    data.series(pick!.kpi.kpi_key, { geographies: geos, from }),
  );
  if (!pick) return null;
  const date = (today ?? new Date()).toLocaleDateString(pl ? "pl-PL" : "en-GB", { day: "numeric", month: "long" });
  const w = series.data ? words(pick.story, pick.kpi, series.data, cat, lang) : null;
  const zs = series.data ? toZSeries(series.data, cat, lang) : [];
  const sample = zs[0]?.points.find((p) => p.y !== null)?.y ?? 1;
  const chart: ZChartProps | null =
    w && zs.length
      ? {
          type: pick.story.band ? "line-band" : zs.length > 1 ? "line-highlight" : "line-band",
          series: zs,
          unit: zUnit(cat, pick.kpi.unit_key, sample),
          lang,
          ariaLabel: w.title,
          band: pick.story.band,
          formatPeriod: periodFormatter(lang),
          height: 170,
        }
      : null;
  return (
    <article className="zt-card h-story" aria-labelledby="h-story-title">
      <p className="label-caps h-story__eyebrow">
        {pl ? "Wykres dnia" : "Chart of the day"} · {date}
      </p>
      <h2 id="h-story-title" className="card-title h-story__title">
        {w?.title ?? kpiName(pick.kpi, lang)}
      </h2>
      <div className="h-story__chart">{chart ? <ZChart {...chart} /> : <div className="h-story__ph" aria-busy="true" />}</div>
      {w?.text ? <p className="small h-story__text">{w.text}</p> : null}
      <Link to={pick.story.to} className="zt-btn h-story__go">
        {pl ? "Zobacz w eksploratorze" : "Open in the explorer"}
      </Link>
    </article>
  );
}
