import { formatNumber } from "../labels";

// The KPI page (/kpi/<key>) sections: value header, sources and dimensions tables, citation.
// Presentational only; field names as in @zohelo/semantic kpi.ts. No route renders them yet.

type HeadlineProps = { period: string; value: number; previous_period?: string; delta: number | null };

export function KpiHeader({
  name_en,
  name_pl,
  unitSymbol,
  headline,
}: {
  name_en: string;
  name_pl: string;
  unitSymbol: string;
  headline: HeadlineProps | null;
}) {
  return (
    <header className="kpi-head">
      <h1>{name_en}</h1>
      <p className="kpi-name-pl" lang="pl">
        {name_pl}
      </p>
      {headline ? (
        <>
          <p className="kpi-value">
            {`${formatNumber(headline.value)} ${unitSymbol}`} <span className="hint">{headline.period}</span>
          </p>
          {headline.delta !== null && (
            <p className="hint">{`${headline.delta > 0 ? "+" : ""}${formatNumber(headline.delta)} vs ${headline.previous_period ?? ""}`}</p>
          )}
        </>
      ) : (
        <p className="empty">No published value yet.</p>
      )}
    </header>
  );
}

type SourceRow = {
  source_key: string;
  name_en: string;
  register_id: string;
  licence_name: string | null;
  licence_url: string | null;
  attribution_text: string | null;
};

export function SourcesTable({ rows }: { rows: SourceRow[] }) {
  if (!rows.length) return <p className="empty">No sources listed.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Register id</th>
            <th>Licence</th>
            <th>Attribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.source_key}>
              <td>{r.name_en}</td>
              <td className="mono">{r.register_id}</td>
              <td>
                {r.licence_url ? (
                  <a href={r.licence_url} target="_blank" rel="noreferrer">
                    {r.licence_name ?? r.licence_url}
                  </a>
                ) : (
                  "–"
                )}
              </td>
              <td>{r.attribution_text ?? "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DimensionsTable({
  geoLevels,
  dimensions,
}: {
  geoLevels: string[];
  dimensions: { dimension_key: string; member_count: number; levels: string[] }[];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Dimension</th>
            <th className="num">Members</th>
            <th>Levels</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>geography</td>
            <td className="num">–</td>
            <td>{geoLevels.join(", ")}</td>
          </tr>
          {dimensions.map((d) => (
            <tr key={d.dimension_key}>
              <td>{d.dimension_key}</td>
              <td className="num">{formatNumber(d.member_count)}</td>
              <td>{d.levels.join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Citation({ text }: { text: string }) {
  return (
    <section className="citation">
      <h2>How to cite</h2>
      <blockquote>{text}</blockquote>
      <button type="button" className="button" onClick={() => void navigator.clipboard.writeText(text)}>
        Copy
      </button>
    </section>
  );
}
