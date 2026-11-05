// Background of the home hero band (design brief §5), three variants behind the switch in the account panel:
//   A  soft gradient mesh in accent/series tokens (Stripe, Linear)
//   B  data lines: faint headline series of Poland drawn as SVG (Our World in Data, FRED)
//   C  Poland map: a faint voivodeship choropleth of one indicator, changing daily (USAFacts)
// Rules: pure CSS/SVG, tokens only, hidden from screen readers, no animation with reduced motion, loaded after
// the ask box is usable (data comes in after first paint). B and C name what they show in a visible caption.

import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi } from "../../data";
import type { Lang } from "../../i18n";
import { Link } from "../../router";
import { VOIVODESHIP_PATHS, POLAND_BOX } from "@zohelo/visuals";
import { kpiName } from "../chartData";
import { fmtPeriod } from "../format";
import type { Variants } from "../variants";

/** Headline series of background B, drawn in series-1…3. */
const LINE_KPIS = ["avg_wage", "cpi_annual_rate", "unemployment_lfs"];
/** Indicators of background C; one per day of the year, in turn. */
const MAP_KPIS = ["unemployment_lfs", "avg_wage", "registered_unemployment", "disposable_income_pc", "dwellings_completed", "pm25_mean"];

export function dayOfYear(d = new Date()): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
}

function linePath(values: (number | null)[], w: number, top: number, bottom: number): string {
  const v = values.map((x) => (x === null || !Number.isFinite(x) ? null : x));
  const ok = v.filter((x): x is number => x !== null);
  if (ok.length < 2) return "";
  const lo = Math.min(...ok);
  const hi = Math.max(...ok);
  let d = "";
  let pen = false;
  v.forEach((y, i) => {
    if (y === null) {
      pen = false;
      return;
    }
    const x = (i / (v.length - 1)) * w;
    const yy = bottom - ((y - lo) / (hi - lo || 1)) * (bottom - top);
    d += `${pen ? "L" : "M"}${x.toFixed(1)} ${yy.toFixed(1)}`;
    pen = true;
  });
  return d;
}

function DataLines({ cat }: { cat: Catalog }) {
  const kpis = LINE_KPIS.map((k) => cat.kpis.find((x) => x.kpi_key === k)).filter((k): k is Kpi => !!k);
  const series = useData(`hero-lines|${kpis.map((k) => k.kpi_key).join(",")}`, () =>
    Promise.all(kpis.map((k) => data.series(k.kpi_key, { geographies: ["PL"] }).then((s) => s[0]?.points.map((p) => p.value) ?? []))),
  );
  const W = 1000;
  // Each line keeps to its own band, so the three never pile up behind the text column.
  const bands: [number, number][] = [
    [40, 150],
    [120, 250],
    [200, 300],
  ];
  return (
    <svg className="h-bg__lines" viewBox={`0 0 ${W} 320`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {(series.data ?? []).map((vals, i) => {
        const d = linePath(vals, W, bands[i]![0], bands[i]![1]);
        if (!d) return null;
        return (
          <g key={i} className={`h-bg__line h-bg__line--${i + 1}`}>
            <path d={`${d}L${W} 320L0 320Z`} className="h-bg__area" />
            <path d={d} className="h-bg__stroke" vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

function MapBackground({ cat, kpi }: { cat: Catalog; kpi: Kpi }) {
  const voiv = cat.geographies.filter((g) => g.level === "voivodeship").map((g) => g.key);
  const latest = useData(`hero-map|${kpi.kpi_key}`, () =>
    data.series(kpi.kpi_key, { geographies: voiv }).then((ss) =>
      ss.map((s) => {
        const pts = s.points.filter((p) => p.value !== null);
        return { geo: s.geography, v: pts[pts.length - 1]?.value ?? null };
      }),
    ),
  );
  const vals = (latest.data ?? []).map((r) => r.v).filter((v): v is number => v !== null);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const cls = (v: number | null) => (v === null || !vals.length ? 0 : 1 + Math.min(4, Math.floor(((v - lo) / (hi - lo || 1)) * 5)));
  return (
    <svg
      className="h-bg__map"
      viewBox={`0 0 ${POLAND_BOX.width} ${POLAND_BOX.height}`}
      preserveAspectRatio="xMaxYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {Object.entries(VOIVODESHIP_PATHS).map(([g, d]) => {
        const v = latest.data?.find((r) => r.geo === g)?.v ?? null;
        return <path key={g} d={d} className={`h-bg__region h-bg__region--${cls(v)}`} />;
      })}
    </svg>
  );
}

/** Background art of the hero; returns the art and the caption naming what it shows (B and C). */
export function heroBackground(variant: Variants["homeBg"], cat: Catalog | undefined, lang: Lang, today = new Date()) {
  const pl = lang === "pl";
  if (variant === "A" || !cat) return { art: <div className="h-bg h-bg--A" aria-hidden="true" />, caption: null };
  if (variant === "B") {
    const names = LINE_KPIS.map((k) => cat.kpis.find((x) => x.kpi_key === k))
      .filter((k): k is Kpi => !!k)
      .map((k) => kpiName(k, lang));
    return {
      art: (
        <div className="h-bg h-bg--B" aria-hidden="true">
          <DataLines cat={cat} />
        </div>
      ),
      caption: (
        <>
          {pl ? "W tle: " : "In the background: "}
          {names.join(" · ")} {pl ? "(Polska, od 2010)" : "(Poland, since 2010)"}
        </>
      ),
    };
  }
  const keys = MAP_KPIS.filter((k) => cat.kpis.some((x) => x.kpi_key === k && x.geo_levels.includes("voivodeship")));
  const kpi = cat.kpis.find((x) => x.kpi_key === keys[dayOfYear(today) % Math.max(1, keys.length)]);
  if (!kpi) return { art: <div className="h-bg h-bg--A" aria-hidden="true" />, caption: null };
  return {
    art: (
      <div className="h-bg h-bg--C" aria-hidden="true">
        <MapBackground cat={cat} kpi={kpi} />
      </div>
    ),
    caption: (
      <>
        {pl ? "Mapa dnia: " : "Map of the day: "}
        <Link to={`/explore?i=${kpi.kpi_key}&lvl=woj&chart=map&t=1y`}>{kpiName(kpi, lang)}</Link>
        {pl ? ", województwa, " : ", voivodeships, "}
        {fmtPeriod(kpi.last_period, lang)}
      </>
    ),
  };
}
