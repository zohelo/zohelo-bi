import { useEffect, useMemo, useState } from "react";
import { metric, slicerParams, slicerValues, tileExploreHref, type SlicerValues } from "@zohelo/semantic";
import { api } from "../api";
import type { DashboardV2, TileV2 } from "../dashboards";
import { tileQuery, tileTitle } from "../dashboardV2";
import { inPeriod } from "../period";
import { SeriesChart, latestByArea } from "../components/SeriesChart";
import { SlicerBar } from "../components/SlicerBar";
import { useData } from "../components/useData";
import { t, type Lang } from "../i18n";
import { Link, navigate, useLocation } from "../router";

// One v2 board (docs/dashboards.md, schema 2): the slicer bar above the tiles, slicer values in the URL.
// Until the explorer visuals arrive, multiples tiles draw a line, ranking and map tiles a bar.

function TileV2View({
  tile,
  values,
  selected,
  onSelect,
  lang,
}: {
  tile: TileV2;
  values: SlicerValues;
  selected: string | null;
  onSelect: (v: string) => void;
  lang: Lang;
}) {
  const m = metric(tile.kpi_key);
  const q = tileQuery(tile, values, selected);
  const key = q ? JSON.stringify([q.metric.id, q.filters]) : null;
  const { data, error, loading } = useData(key, () => api.series(q!.metric.id, q!.filters));
  const from = q?.from;
  const to = q?.to;
  const rows = useMemo(() => (data ?? []).filter((r) => inPeriod(r.date_key, from, to)), [data, from, to]);
  const title = tileTitle(tile, lang, selected);
  const note = lang === "pl" ? (tile.note_pl ?? tile.note_en) : (tile.note_en ?? tile.note_pl);
  const chart = tile.chart === "line" || tile.chart === "multiples" ? "line" : "bar";

  // A selecting tile picks its largest bar first, so linked tiles start with content.
  useEffect(() => {
    if (tile.selects && !selected && rows.length) {
      const top = latestByArea(rows).sort((a, b) => b.value - a.value)[0];
      if (top) onSelect(top.raw);
    }
  }, [tile.selects, selected, rows, onSelect]);

  return (
    <section className="tile">
      <header>
        <h2>{title}</h2>
        <Link to={tileExploreHref(tile, values)} className="tile-link" title={t(lang, "dashboard.openInExplorer")}>
          {t(lang, "dashboard.explore")}
        </Link>
      </header>
      {note && <p className="note">{note}</p>}
      {!m ? (
        <p className="hint">{t(lang, "dashboard.notAvailable")}</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : loading && !data ? (
        <div className="skeleton" />
      ) : (
        <SeriesChart
          rows={rows}
          chart={chart}
          unit={m.unitLabel}
          label={title}
          selected={tile.selects ? selected : undefined}
          onSelect={tile.selects ? onSelect : undefined}
          lang={lang}
        />
      )}
    </section>
  );
}

export function DashboardPageV2({ dashboard, lang }: { dashboard: DashboardV2; lang: Lang }) {
  const url = useLocation();
  const slicers = dashboard.slicers ?? [];
  const values = slicerValues(url.searchParams, slicers);
  const [selected, setSelected] = useState<string | null>(null);

  function onChange(next: SlicerValues) {
    const p = slicerParams(next).toString();
    navigate(p ? `${url.pathname}?${p}` : url.pathname);
  }

  const gm = slicers.includes("geography") ? dashboard.tiles.map((x) => metric(x.kpi_key)).find((x) => x !== undefined) : undefined;
  const members = useData(gm ? `members:${gm.id}` : null, () => api.members(gm!.id));
  const geographies = members.data?.values.geography_name ?? [];

  const title = lang === "pl" ? dashboard.title_pl : dashboard.title_en;
  const description = lang === "pl" ? dashboard.description_pl : dashboard.description_en;

  return (
    <div className="page">
      <div className="page-head">
        <h1>{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      <SlicerBar slicers={slicers} values={values} geographies={geographies} onChange={onChange} lang={lang} />
      <div className="grid">
        {dashboard.tiles.map((tile, i) => (
          <TileV2View key={i} tile={tile} values={values} selected={selected} onSelect={setSelected} lang={lang} />
        ))}
      </div>
    </div>
  );
}
