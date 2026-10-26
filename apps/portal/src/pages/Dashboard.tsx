import { useEffect, useMemo, useState } from "react";
import { metric } from "@zohelo/semantic";
import { api } from "../api";
import type { Dashboard as DashboardDef, Tile } from "../dashboards";
import { display } from "../labels";
import { SeriesChart, latestByArea } from "../components/SeriesChart";
import { useData } from "../components/useData";
import { Link } from "../router";

function resolve(filters: Record<string, string[]>, selected: string | null): Record<string, string[]> | null {
  const out: Record<string, string[]> = {};
  for (const [column, values] of Object.entries(filters)) {
    if (values.includes("$selected") && !selected) return null;
    out[column] = values.map((v) => (v === "$selected" ? selected! : String(v)));
  }
  return out;
}

function TileView({ tile, selected, onSelect }: { tile: Tile; selected: string | null; onSelect: (v: string) => void }) {
  const m = metric(tile.metric)!;
  const filters = resolve(tile.filters, selected);
  const key = filters ? JSON.stringify([tile.metric, filters]) : null;
  const { data, error, loading } = useData(key, () => api.series(tile.metric, filters!));
  const title = tile.title.replace("$selected", selected ? display("geography_name", selected) : "…");

  // A selecting tile picks its largest bar first, so linked tiles start with content.
  useEffect(() => {
    if (tile.selects && !selected && data?.length) {
      const top = latestByArea(data).sort((a, b) => b.value - a.value)[0];
      if (top) onSelect(top.raw);
    }
  }, [tile.selects, selected, data, onSelect]);

  const exploreHref = useMemo(() => {
    const p = new URLSearchParams({ metric: tile.metric });
    if (filters) for (const [c, v] of Object.entries(filters)) p.set(c, v.join("|"));
    return `/explore?${p}`;
  }, [tile.metric, filters]);

  return (
    <section className="tile">
      <header>
        <h2>{title}</h2>
        <Link to={exploreHref} className="tile-link" title="Open in the explorer">
          Explore →
        </Link>
      </header>
      {tile.note && <p className="note">{tile.note}</p>}
      {error ? (
        <p className="error">{error}</p>
      ) : loading && !data ? (
        <div className="skeleton" />
      ) : (
        <SeriesChart
          rows={data ?? []}
          chart={tile.chart}
          unit={m.unitLabel}
          label={title}
          selected={tile.selects ? selected : undefined}
          onSelect={tile.selects ? onSelect : undefined}
        />
      )}
    </section>
  );
}

export function Dashboard({ dashboard }: { dashboard: DashboardDef }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div className="page">
      <div className="page-head">
        <h1>{dashboard.title}</h1>
        {dashboard.description && <p className="lede">{dashboard.description}</p>}
      </div>
      <div className="grid">
        {dashboard.tiles.map((t, i) => (
          <TileView key={i} tile={t} selected={selected} onSelect={setSelected} />
        ))}
      </div>
    </div>
  );
}
