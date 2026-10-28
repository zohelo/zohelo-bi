import { useEffect, useMemo, useRef, useState } from "react";
import { search as searchItems, type SearchItem } from "@zohelo/semantic";
import { api } from "../api";
import { useData } from "../components/useData";
import { SOURCES, formatNumber } from "../labels";
import { useLocation } from "../router";

// The measure catalogue (Gold dim_measure): every block each source offers, whether it is
// already modelled ("activated") and, if not, why. One list across sources.

const PAGE = 100;

export function Catalogue() {
  const { data, error, loading } = useData("catalog", api.catalog);
  const url = useLocation();
  // The query lives in ?q=; the local copy keeps typing smooth (replaceState fires no event).
  const [search, setSearch] = useState(() => url.searchParams.get("q") ?? "");
  const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string>("");
  const [onlyActivated, setOnlyActivated] = useState(true);
  const [page, setPage] = useState(1);

  // Ctrl+K / Cmd+K focuses the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo<SearchItem[]>(
    () =>
      (data ?? []).map((r) => {
        const name = r.measure_name ?? r.block_name ?? r.block_id;
        return { key: r.measure_key, name_pl: name, name_en: name, codes: [r.block_id] };
      }),
    [data],
  );

  const filtered = useMemo(() => {
    const rows = (data ?? []).filter((r) => (!onlyActivated || r.activated) && (!source || r.source_system === source));
    if (!search.trim()) return rows;
    const order = new Map(searchItems(items, search, 5000).map((h, i) => [h.key, i]));
    return rows.filter((r) => order.has(r.measure_key)).sort((a, b) => order.get(a.measure_key)! - order.get(b.measure_key)!);
  }, [data, items, search, source, onlyActivated]);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    const next = new URL(window.location.href);
    if (value) next.searchParams.set("q", value);
    else next.searchParams.delete("q");
    window.history.replaceState(null, "", next);
  };

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
          ref={input}
          className="search wide"
          placeholder="Search measures…"
          aria-label="Search measures"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
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
        {data && <span className="hint">{formatNumber(filtered.length)} results</span>}
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
