import { useMemo } from "react";
import { manifest, matrixToCsv, matrixToXlsx, metric as findMetric, pivot } from "@zohelo/semantic";
import { api, type Filters } from "../api";
import { FilterSelect } from "../components/FilterSelect";
import { PivotMatrix } from "../components/PivotMatrix";
import { SeriesChart } from "../components/SeriesChart";
import { DataTable, download, toCsv } from "../components/DataTable";
import { useData } from "../components/useData";
import { navigate, useLocation } from "../router";
import { parseShelves, shelfColumns, shelvesToParams, swapShelves } from "../shelves";

// Pick a metric, cut it by its dimensions, see the matrix or the chart and the rows, download CSV.
// The state lives in the URL, so every view can be shared or opened from a dashboard tile.

export function Explorer() {
  const url = useLocation();
  const m = findMetric(url.searchParams.get("metric") ?? "") ?? manifest.metrics[0]!;
  const filterDims = m.dimensions.filter((d) => d.filter);
  const view = url.searchParams.get("view") === "chart" ? "chart" : "matrix";
  const columns = useMemo(() => shelfColumns(m), [m]);
  const shelves = parseShelves(
    url.searchParams,
    columns.map((c) => c.column),
  );
  const label = (c: string) => columns.find((x) => x.column === c)?.label ?? c;
  const rowLabels = shelves.rows.map(label);
  const colLabels = shelves.cols.map(label);

  const filters: Filters = useMemo(() => {
    const out: Filters = {};
    const explicit = url.searchParams.has("metric");
    for (const d of filterDims) {
      const raw = url.searchParams.get(d.column);
      if (raw) out[d.column] = raw.split("|").filter(Boolean);
      else if (!explicit && m.defaults[d.column]) out[d.column] = [m.defaults[d.column]!];
    }
    return out;
  }, [url, m, filterDims]);

  const members = useData(`members:${m.id}`, () => api.members(m.id));
  const series = useData(JSON.stringify([m.id, filters]), () => api.series(m.id, filters));

  function go(metricId: string, next: Filters) {
    const p = new URLSearchParams({ metric: metricId });
    for (const [c, v] of Object.entries(next)) if (v.length) p.set(c, v.join("|"));
    if (url.searchParams.has("view")) p.set("view", view);
    for (const k of ["rows", "cols"]) if (url.searchParams.has(k)) p.set(k, url.searchParams.get(k)!);
    navigate(`/explore?${p}`);
  }

  function pickView(next: "matrix" | "chart") {
    const p = new URLSearchParams(url.searchParams);
    p.set("view", next);
    navigate(`/explore?${p}`);
  }

  function swap() {
    const p = new URLSearchParams(url.searchParams);
    shelvesToParams(swapShelves(shelves), p);
    navigate(`/explore?${p}`);
  }

  function pickMetric(id: string) {
    const target = findMetric(id)!;
    go(id, Object.fromEntries(Object.entries(target.defaults).map(([c, v]) => [c, [v]])));
  }

  // Values still possible for one dimension given the choices in all the others.
  function available(column: string): Set<string> {
    const combos = members.data?.combinations ?? [];
    const set = new Set<string>();
    for (const row of combos) {
      const fits = Object.entries(filters).every(([c, vs]) => c === column || !vs.length || vs.includes(String(row[c])));
      if (fits && row[column] != null) set.add(String(row[column]));
    }
    return set;
  }

  const rows = series.data ?? [];
  const truncated = rows.length >= 20000;
  const shelfKey = `${shelves.rows.join(",")}|${shelves.cols.join(",")}`;
  const matrix = useMemo(() => {
    const [rowDims, colDims] = shelfKey.split("|").map((x) => x.split(","));
    return pivot({ rows: series.data ?? [], rowDims: rowDims!, colDims: colDims!, value: "value" });
  }, [series.data, shelfKey]);

  const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const noMatrix = view === "chart" || !rows.length || matrix.truncated;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Explorer</h1>
        <p className="lede">Pick a measure, narrow it down, compare sources. Every view has its own link.</p>
      </div>

      <div className="metric-tabs" role="tablist">
        {manifest.metrics.map((x) => (
          <button
            key={x.id}
            role="tab"
            aria-selected={x.id === m.id}
            className={x.id === m.id ? "selected" : undefined}
            onClick={() => pickMetric(x.id)}
          >
            {x.label}
          </button>
        ))}
      </div>
      <p className="metric-description">{m.description}</p>

      <div className="filters">
        {filterDims.map((d) => (
          <FilterSelect
            key={d.column}
            column={d.column}
            label={d.label}
            values={members.data?.values[d.column] ?? []}
            available={available(d.column)}
            chosen={filters[d.column] ?? []}
            onChange={(values) => go(m.id, { ...filters, [d.column]: values })}
          />
        ))}
        {members.loading && <span className="hint">Loading filters…</span>}
      </div>

      <div className="metric-tabs view-tabs" role="tablist" aria-label="View">
        {(["matrix", "chart"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={v === view} className={v === view ? "selected" : undefined} onClick={() => pickView(v)}>
            {v === "matrix" ? "Matrix" : "Chart"}
          </button>
        ))}
        <button type="button" className="button" onClick={swap}>
          Swap rows and columns
        </button>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Matrix</h2>
          <div>
            <button
              type="button"
              className="button"
              disabled={noMatrix}
              onClick={() => download(`${m.id}-matrix.csv`, matrixToCsv(matrix, rowLabels))}
            >
              CSV
            </button>{" "}
            <button
              type="button"
              className="button"
              disabled={noMatrix}
              onClick={() =>
                download(`${m.id}-matrix.xlsx`, matrixToXlsx(matrix, { rowHeader: rowLabels, title: m.label, unit: m.unitLabel }), XLSX)
              }
            >
              XLSX
            </button>
          </div>
        </header>
        {series.error ? (
          <p className="error">{series.error}</p>
        ) : series.loading && !series.data ? (
          <div className="skeleton tall" />
        ) : view === "chart" ? (
          <SeriesChart rows={rows} chart="line" unit={m.unitLabel} label={m.label} />
        ) : (
          <PivotMatrix result={matrix} unit={m.unitLabel} rowLabels={rowLabels} colLabels={colLabels} />
        )}
        {truncated && <p className="hint">The first 20,000 rows are shown. Narrow the filters to see everything.</p>}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Rows</h2>
          <button type="button" className="button" disabled={!rows.length} onClick={() => download(`${m.id}.csv`, toCsv(rows))}>
            Download CSV
          </button>
        </header>
        <DataTable rows={rows} />
      </section>
    </div>
  );
}
