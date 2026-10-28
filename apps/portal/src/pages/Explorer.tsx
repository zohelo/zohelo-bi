import { useMemo, useState } from "react";
import {
  manifest,
  matrixToCsv,
  matrixToXlsx,
  metric as findMetric,
  pivot,
  transformMatrix,
  transformUnit,
  type MatrixTransform,
} from "@zohelo/semantic";
import { api, type Filters } from "../api";
import { FilterSelect } from "../components/FilterSelect";
import { PivotMatrix } from "../components/PivotMatrix";
import { ShelfPanel } from "../components/ShelfPanel";
import { SeriesChart } from "../components/SeriesChart";
import { DataTable, download, toCsv } from "../components/DataTable";
import { useData } from "../components/useData";
import { inPeriod, parsePeriod } from "../period";
import { Link, navigate, useLocation } from "../router";
import { browserStorage, loadViews, removeView, saveView } from "../savedViews";
import { parseShelves, shelfColumns, shelvesToParams, swapShelves, type Shelves } from "../shelves";

// Pick a metric, cut it by its dimensions, see the matrix or the chart and the rows, download CSV.
// The state lives in the URL, so every view can be shared or opened from a dashboard tile.

const TRANSFORMS: [MatrixTransform, string][] = [
  ["none", "None"],
  ["change", "Change on previous period"],
  ["yoy", "Year on year %"],
  ["index", "Index (base = 100)"],
];

export function Explorer() {
  const url = useLocation();
  const store = useMemo(() => browserStorage(), []);
  const [views, setViews] = useState(() => loadViews(store));
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
    for (const k of ["rows", "cols", "t", "base", "from", "to"]) if (url.searchParams.has(k)) p.set(k, url.searchParams.get(k)!);
    navigate(`/explore?${p}`);
  }

  function pickView(next: "matrix" | "chart") {
    const p = new URLSearchParams(url.searchParams);
    p.set("view", next);
    navigate(`/explore?${p}`);
  }

  function layout(next: Shelves) {
    const p = new URLSearchParams(url.searchParams);
    shelvesToParams(next, p);
    navigate(`/explore?${p}`);
  }

  function pickTransform(next: MatrixTransform, nextBase?: string) {
    const p = new URLSearchParams(url.searchParams);
    if (next === "none") p.delete("t");
    else p.set("t", next);
    if (next === "index" && nextBase) p.set("base", nextBase);
    else if (next !== "index") p.delete("base");
    navigate(`/explore?${p}`);
  }

  function pickPeriod(key: "from" | "to", value: string) {
    const p = new URLSearchParams(url.searchParams);
    if (value.trim()) p.set(key, value.trim());
    else p.delete(key);
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

  // The period limit (from/to) applies to the fetched rows; truncation is judged on the unfiltered rows.
  const { from, to } = parsePeriod(url.searchParams);
  const rows = useMemo(() => (series.data ?? []).filter((r) => inPeriod(r.date_key, from, to)), [series.data, from, to]);
  const truncated = (series.data ?? []).length >= 20000;
  const shelfKey = `${shelves.rows.join(",")}|${shelves.cols.join(",")}`;
  const matrix = useMemo(() => {
    const [rowDims, colDims] = shelfKey.split("|").map((x) => x.split(","));
    return pivot({ rows, rowDims: rowDims!, colDims: colDims!, value: "value" });
  }, [rows, shelfKey]);

  // Transforms work along time, so only with Period as the only column dimension.
  const canTransform = shelves.cols.length === 1 && shelves.cols[0] === "date_key";
  const tParam = url.searchParams.get("t");
  const t: MatrixTransform = canTransform && (tParam === "change" || tParam === "yoy" || tParam === "index") ? tParam : "none";
  const base = url.searchParams.get("base") ?? matrix.colKeys[0]?.[0] ?? "";
  const shown = useMemo(() => transformMatrix(matrix, t, base), [matrix, t, base]);
  const unit = transformUnit(t, m.unitLabel, base);
  const periods = matrix.colKeys.map((k) => k[0]!);

  const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const noMatrix = view === "chart" || !rows.length || matrix.truncated;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Explorer</h1>
        <p className="lede">Pick a measure, narrow it down, compare sources. Every view has its own link.</p>
        <button
          type="button"
          className="button"
          onClick={() => {
            saveView(store, { name: `${m.label} · ${new Date().toISOString().slice(0, 10)}`, url: url.pathname + url.search });
            // Re-read what storage kept: with storage blocked nothing was saved and the list stays as it is.
            setViews(loadViews(store));
          }}
        >
          Save view
        </button>
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

      <ShelfPanel columns={columns} shelves={shelves} onChange={layout} />

      <div className="metric-tabs view-tabs" role="tablist" aria-label="View">
        {(["matrix", "chart"] as const).map((v) => (
          <button key={v} role="tab" aria-selected={v === view} className={v === view ? "selected" : undefined} onClick={() => pickView(v)}>
            {v === "matrix" ? "Matrix" : "Chart"}
          </button>
        ))}
        <button type="button" className="button" onClick={() => layout(swapShelves(shelves))}>
          Swap rows and columns
        </button>
        <select
          aria-label="Transform"
          value={t}
          disabled={!canTransform}
          onChange={(e) => pickTransform(e.target.value as MatrixTransform, base)}
        >
          {TRANSFORMS.map(([v, text]) => (
            <option key={v} value={v}>
              {text}
            </option>
          ))}
        </select>
        {t === "index" && (
          <select aria-label="Base period" value={base} onChange={(e) => pickTransform("index", e.target.value)}>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        )}
        {(["from", "to"] as const).map((k) => (
          <input
            key={k}
            type="text"
            inputMode="numeric"
            placeholder="YYYY"
            size={10}
            aria-label={k === "from" ? "From" : "To"}
            value={url.searchParams.get(k) ?? ""}
            onChange={(e) => pickPeriod(k, e.target.value)}
          />
        ))}
        {!canTransform && <span className="hint">Transforms need Period as the only column.</span>}
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>Matrix</h2>
          <div>
            <button
              type="button"
              className="button"
              disabled={noMatrix}
              onClick={() => download(`${m.id}-matrix.csv`, matrixToCsv(shown, rowLabels))}
            >
              CSV
            </button>{" "}
            <button
              type="button"
              className="button"
              disabled={noMatrix}
              onClick={() => download(`${m.id}-matrix.xlsx`, matrixToXlsx(shown, { rowHeader: rowLabels, title: m.label, unit }), XLSX)}
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
          <PivotMatrix result={shown} unit={unit} rowLabels={rowLabels} colLabels={colLabels} />
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

      {views.length > 0 && (
        <section className="panel saved-views">
          <header className="panel-head">
            <h2>Saved views</h2>
          </header>
          <ul>
            {views.map((v) => (
              <li key={v.id}>
                <Link to={v.url}>{v.name}</Link> <span className="hint">{v.saved_at.slice(0, 10)}</span>{" "}
                <button type="button" className="button" aria-label={`Remove ${v.name}`} onClick={() => setViews(removeView(store, v.id))}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
