// KPI row of a dashboard page: 3–5 tiles with the latest value, neutral change, a context line and a
// 5-year sparkline. The geography follows the page's area filter where the KPI has it.

import type { V3KpiTile } from "@zohelo/semantic";
import { useData } from "../../components/useData";
import { data, type Catalog, type Kpi, type Latest } from "../../data";
import type { Lang } from "../../i18n";
import { geoName, kpiName, sourceName } from "../chartData";
import { basisFor, fmtChange, fmtPeriod, fmtValue, freqLabel } from "../format";
import { KpiTile } from "../ui/blocks";

type Row = { kpi: Kpi; geo: string; tile: Exclude<V3KpiTile, string> };

export function tileRows(tiles: V3KpiTile[], cat: Catalog, geo: string | undefined): Row[] {
  return tiles.flatMap((t) => {
    const tile = typeof t === "string" ? { kpi: t } : t;
    const kpi = cat.kpis.find((k) => k.kpi_key === tile.kpi);
    if (!kpi) return [];
    const want = tile.geography ?? geo ?? "PL";
    return [{ kpi, tile, geo: kpi.geographies.includes(want) ? want : "PL" }];
  });
}

export function KpiRow({
  tiles,
  cat,
  lang,
  geo,
  labelId,
}: {
  tiles: V3KpiTile[];
  cat: Catalog;
  lang: Lang;
  geo?: string;
  labelId: string;
}) {
  const pl = lang === "pl";
  const rows = tileRows(tiles, cat, geo);
  const key = `kpis|${rows.map((r) => `${r.kpi.kpi_key}@${r.geo}`).join(",")}`;
  const loaded = useData(key, () =>
    Promise.all(
      rows.map(async (r) => {
        const [latest, eu, spark] = await Promise.all([
          data.latest(r.kpi.kpi_key, r.geo),
          r.geo !== "EU27" && r.kpi.geographies.includes("EU27")
            ? data.latest(r.kpi.kpi_key, "EU27").catch(() => null)
            : Promise.resolve(null),
          data.series(r.kpi.kpi_key, { geographies: [r.geo], from: String(Number(r.kpi.last_period.slice(0, 4)) - 5) }).catch(() => []),
        ]);
        return { latest, eu, spark: spark[0]?.points.map((p) => p.value) };
      }),
    ),
  );
  const context = (r: Row, eu: Latest | null): string => {
    const own = pl ? r.tile.context_pl : r.tile.context_en;
    if (own) return own;
    if (eu) return `${geoName(cat, "EU27", lang)}: ${fmtValue(eu.value, r.kpi.unit_key, cat, lang)}`;
    const freq = { M: ["Dane miesięczne", "Monthly data"], Q: ["Dane kwartalne", "Quarterly data"], A: ["Dane roczne", "Annual data"] }[
      r.kpi.frequency
    ];
    return r.geo === "PL" ? freq[pl ? 0 : 1]! : `${geoName(cat, r.geo, lang)}, ${freqLabel(r.kpi.frequency, lang)}`;
  };
  return (
    <section className="t-section" aria-labelledby={labelId}>
      <h2 id={labelId} className="section-title">
        {pl ? "Najważniejsze liczby" : "Key figures"}
      </h2>
      {loaded.error ? (
        <p role="alert" className="t-dnote">
          {pl ? "Nie udało się wczytać wartości: " : "Could not load the values: "}
          {loaded.error}
        </p>
      ) : null}
      <div className="t-kpis">
        {rows.map((r, i) => {
          const d = loaded.data?.[i];
          const l = d?.latest;
          return (
            <KpiTile
              key={r.kpi.kpi_key}
              to={`/kpi/${r.kpi.kpi_key}`}
              label={kpiName(r.kpi, lang) + (r.geo !== "PL" ? ` · ${geoName(cat, r.geo, lang)}` : "")}
              period={l ? fmtPeriod(l.period, lang) : "…"}
              value={l ? fmtValue(l.value, r.kpi.unit_key, cat, lang) : "…"}
              change={l ? fmtChange(l.value, l.previous_value, r.kpi.unit_key, basisFor(r.kpi.frequency), cat, lang) : undefined}
              context={d ? context(r, d.eu) : undefined}
              source={l ? sourceName(cat, l.source_key, lang) : undefined}
              spark={d?.spark}
            />
          );
        })}
      </div>
    </section>
  );
}
