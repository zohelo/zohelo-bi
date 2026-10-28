import { useMemo, useState } from "react";
import { api } from "../api";
import { useData } from "../components/useData";
import { SOURCES, formatNumber } from "../labels";

// The measure catalogue (Gold dim_measure): every block each source offers, whether it is
// already modelled ("activated") and, if not, why. One list across sources.

const PAGE = 100;

export function Catalogue() {
  const { data, error, loading } = useData("catalog", api.catalog);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>("");
  const [onlyActivated, setOnlyActivated] = useState(true);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("pl");
    return (data ?? []).filter(
      (r) =>
        (!onlyActivated || r.activated) &&
        (!source || r.source_system === source) &&
        (!needle || `${r.measure_name ?? ""} ${r.block_name ?? ""} ${r.block_id}`.toLocaleLowerCase("pl").includes(needle)),
    );
  }, [data, search, source, onlyActivated]);

  const counts = useMemo(() => {
    const c = { total: data?.length ?? 0, activated: 0 };
    for (const r of data ?? []) if (r.activated) c.activated++;
    return c;
  }, [data]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Catalogue</h1>
        <p className="lede">
          {data
            ? `${formatNumber(counts.total)} data blocks across sources; ${counts.activated} measures modelled in the Gold sample so far.`
            : "Every data block each source offers, and which are modelled."}
        </p>
      </div>
      <div className="filters">
        <input
          className="search wide"
          placeholder="Search measures…"
          value={search}
          onChange={(e) => (setSearch(e.target.value), setPage(1))}
        />
        <select value={source} onChange={(e) => (setSource(e.target.value), setPage(1))} aria-label="Source">
          <option value="">All sources</option>
          {Object.entries(SOURCES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={onlyActivated} onChange={(e) => (setOnlyActivated(e.target.checked), setPage(1))} />
          Modelled only
        </label>
      </div>
      <section className="panel">
        {error ? (
          <p className="error">{error}</p>
        ) : loading ? (
          <div className="skeleton tall" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Measure</th>
                  <th>Source</th>
                  <th>Block</th>
                  <th>Period</th>
                  <th className="num">Series</th>
                  <th className="num">Areas</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, page * PAGE).map((r) => (
                  <tr key={r.measure_key}>
                    <td className="wrap">{r.measure_name ?? r.block_name ?? r.block_id}</td>
                    <td>{SOURCES[r.source_system] ?? r.source_system}</td>
                    <td className="mono">{r.block_id}</td>
                    <td className="nowrap">{r.first_date ? `${r.first_date.slice(0, 4)}–${r.last_date?.slice(0, 4) ?? ""}` : "–"}</td>
                    <td className="num">{formatNumber(r.series)}</td>
                    <td className="num">{formatNumber(r.areas)}</td>
                    <td>
                      <span className={`status status-${r.status.replaceAll(" ", "-")}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="hint">
              {formatNumber(Math.min(filtered.length, page * PAGE))} of {formatNumber(filtered.length)}
              {filtered.length > page * PAGE && (
                <>
                  {" · "}
                  <button type="button" className="link-button" onClick={() => setPage(page + 1)}>
                    Show more
                  </button>
                </>
              )}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
